import net from 'net';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from './../utils/db';
import { decryptData, encryptData } from './../utils/encryption';
import { findAvailablePort } from './../utils/port-finder';

interface Peer {
    host: string;
    port: number;
}

class P2PNode {
    private nodeId: string;
    private peers: Peer[] = [];
    private requestForwarding: Map<string, net.Socket[]> = new Map();
    public server: net.Server;
    public port: number;
    private missingFileCache: Map<string, number> = new Map(); // Cache to track missing files
    private cacheTimeout: number = 60000; // 1 minute cache timeout to prevent repeated requests

    constructor() {
        this.nodeId = this.generateNodeId();
        this.port = 3001; // Default port
        this.server = net.createServer(this.handleConnection.bind(this));
        this.initializeNode();
    }

    private generateNodeId(): string {
        const hash = crypto.createHash('sha256').update(Date.now().toString()).digest('hex');
        return `node-${hash.slice(0, 16)}`;
    }

    private async initializeNode() {
        try {
            await this.loadPeers();
            await this.findAvailablePort();
            this.startServer();
        } catch (error) {
            console.error('Failed to initialize node:', error);
        }
    }

    private async findAvailablePort() {
        try {
            this.port = await findAvailablePort(this.port);
        } catch (err) {
            console.error('Error finding an available port:', err);
            throw err;
        }
    }

    private startServer() {
        this.server.listen(this.port, () => {
            console.log(`P2P node ${this.nodeId} listening on port ${this.port}`);
            this.connectToPeers();
        });
    }

    private async loadPeers() {
        const peersPath = path.join(__dirname, '..', 'data', 'peers.json');
        try {
            const peersData = await fs.promises.readFile(peersPath, 'utf-8');
            const peerList: string[] = JSON.parse(peersData);
            this.peers = peerList.map((peerString: string) => {
                const [host, port] = peerString.split(':');
                return { host, port: parseInt(port, 10) };
            });
        } catch (error) {
            console.log('No peers found or error loading peers:', error);
            this.peers = [];
        }
    }

    private connectToPeers() {
        this.peers.forEach(peer => {
            const client = new net.Socket();
            client.connect(peer.port, peer.host, () => {
                console.log(`Connected to peer ${peer.host}:${peer.port}`);
                this.sendMessage(client, 'HELLO', { nodeId: this.nodeId });
            });

            client.on('data', (data) => {
                this.decodeMessage(data, client);
            });

            client.on('close', () => {
                console.log(`Connection to peer ${peer.host}:${peer.port} closed`);
            });

            client.on('error', (err) => {
                console.error(`Connection error with peer ${peer.host}:${peer.port}:`, err);
            });
        });
    }

    private handleConnection(socket: net.Socket) {
        console.log('New peer connected');
        let buffer = Buffer.alloc(0);

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);
            while (buffer.length >= 4) {
                const length = buffer.readUInt32BE(0);
                if (buffer.length >= length + 4) {
                    const messageBuffer = buffer.slice(4, length + 4);
                    this.decodeMessage(messageBuffer, socket);
                    buffer = buffer.slice(length + 4);
                } else {
                    break;
                }
            }
        });

        socket.on('error', (err:any) => {
            console.error('Connection error:', err);
            if (err.code === 'ECONNRESET') {
                console.log('Peer connection was reset.');
            }
        });
    }

    private decodeMessage(data: Buffer, socket: net.Socket) {
        try {
            const message = JSON.parse(data.toString('utf8'));
            this.handleMessage(message, socket);
        } catch (error) {
            console.error('Error parsing message from peer:', error);
        }
    }

    private handleMessage(message: any, socket: net.Socket) {
        switch (message.type) {
            case 'HELLO':
                console.log(`Received HELLO from node ${message.nodeId}`);
                break;
            case 'GET_FILE':
                this.handleGetFile(message.hash, socket);
                break;
            case 'FILE_FOUND':
                this.handleFileFound(message.hash, message.metadata, message.data, socket);
                break;
            case 'FORWARD_REQUEST':
                this.handleForwardRequest(message.hash, socket);
                break;
            case 'FILE_NOT_FOUND':
                this.handleFileNotFound(message.hash, socket);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    private isInCache(hash: string): boolean {
        const lastRequestTime = this.missingFileCache.get(hash);
        const currentTime = Date.now();
        if (lastRequestTime && currentTime - lastRequestTime < this.cacheTimeout) {
            return true;
        }
        return false;
    }

    private addToCache(hash: string): void {
        this.missingFileCache.set(hash, Date.now());
    }

    private async handleGetFile(hash: string, socket: net.Socket) {
        try {
            const encryptedMetadata = await db.get(hash);
            if (encryptedMetadata) {
                const metadataStr = decryptData(encryptedMetadata, hash);
                const metadata = JSON.parse(metadataStr);
                const decryptedData = decryptData(metadata.data, hash);
                this.sendMessage(socket, 'FILE_FOUND', { hash, metadata, data: decryptedData });
            } else {
                this.forwardRequest(hash, socket);
            }
        } catch (error: any) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                if (this.isInCache(hash)) {
                    console.warn(`File ${hash} already requested recently. Skipping forwarding request.`);
                } else {
                    console.warn(`File ${hash} not found in local DB. Forwarding request to peers...`);
                    this.addToCache(hash);
                    this.forwardRequest(hash, socket);
                }
            } else {
                console.error('Unexpected error retrieving file:', error);
            }
        }
    }

    private async handleFileFound(hash: string, metadata: any, data: string, socket: net.Socket) {
        // Store the data in the local database
        try {
            const encryptedMetadata = encryptData(JSON.stringify(metadata), hash);
            await db.put(hash, encryptedMetadata);
            console.log(``);
        } catch (error) {
            console.error('Error storing file:', error);
        }

        // Send the file to the requesting socket and others waiting
        const forwardingSockets = this.requestForwarding.get(hash) || [];
        this.requestForwarding.delete(hash);

        forwardingSockets.forEach(peerSocket => {
            this.sendMessage(peerSocket, 'FILE_FOUND', { hash, metadata, data });
        });

        this.sendMessage(socket, 'FILE_FOUND', { hash, metadata, data });
    }

    private async handleForwardRequest(hash: string, socket: net.Socket) {
        const result = await this.getFile(hash);
        if (result) {
            this.sendMessage(socket, 'FILE_FOUND', { hash, metadata: result.metadata, data: result.data });
        } else {
            this.sendMessage(socket, 'FILE_NOT_FOUND', { hash });
        }
    }

    private handleFileNotFound(hash: string, socket: net.Socket) {
        this.sendMessage(socket, 'FILE_NOT_FOUND', { hash });
    }

    private forwardRequest(hash: string, requestingSocket: net.Socket) {
        const forwardingSockets = this.peers.map(peer => {
            const client = new net.Socket();
            client.connect(peer.port, peer.host, () => {
                this.sendMessage(client, 'FORWARD_REQUEST', { hash });
            });

            client.on('data', (data) => {
                this.decodeMessage(data, client);
            });

            client.on('error', (err) => {
                console.error(`Error connecting to peer ${peer.host}:${peer.port}:`, err);
            });

            return client;
        });

        // Store the sockets that are waiting for the result
        this.requestForwarding.set(hash, forwardingSockets);
    }

    public async getFile(hash: string): Promise<{ metadata: any, data: string } | null> {
        try {
            const encryptedMetadata = await db.get(hash);
            if (encryptedMetadata) {
                const metadataStr = decryptData(encryptedMetadata, hash);
                const metadata = JSON.parse(metadataStr);
                const decryptedData = decryptData(metadata.data, hash);
                return { metadata, data: decryptedData };
            }
        } catch (error: any) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                console.log(`File ${hash} not found locally.`);
            } else {
                console.error('Error retrieving file locally:', error);
            }
        }

        // Attempt to find the file from peers
        for (const peer of this.peers) {
            try {
                const result = await new Promise<{ metadata: any, data: string } | null>((resolve, reject) => {
                    const client = new net.Socket();
                    client.connect(peer.port, peer.host, () => {
                        this.sendMessage(client, 'GET_FILE', { hash });
                    });

                    let buffer = Buffer.alloc(0);
                    client.on('data', (data) => {
                        buffer = Buffer.concat([buffer, data]);
                        while (buffer.length >= 4) {
                            const length = buffer.readUInt32BE(0);
                            if (buffer.length >= length + 4) {
                                const messageBuffer = buffer.slice(4, length + 4);
                                try {
                                    const message = JSON.parse(messageBuffer.toString('utf8'));
                                    if (message.type === 'FILE_FOUND') {
                                        resolve({ metadata: message.metadata, data: message.data });
                                    } else if (message.type === 'FILE_NOT_FOUND') {
                                        resolve(null);
                                    }
                                } catch (err) {
                                    reject(err);
                                }
                                buffer = buffer.slice(length + 4);
                            } else {
                                break;
                            }
                        }
                    });

                    client.on('error', reject);
                });

                if (result) {
                    const encryptedMetadata = encryptData(JSON.stringify(result.metadata), hash);
                    await db.put(hash, encryptedMetadata);
                    console.log(`found ${hash} from peer`);
                    return result;
                }
            } catch (error) {
                console.error(`Error getting file from peer ${peer.host}:${peer.port}:`, error);
            }
        }

        return null;
    }

    private sendMessage(socket: net.Socket, type: string, payload: any) {
        try {
            const message = JSON.stringify({ type, ...payload });
            const lengthBuffer = Buffer.alloc(4);
            lengthBuffer.writeUInt32BE(message.length, 0);
            const messageBuffer = Buffer.from(message, 'utf8');
            socket.write(Buffer.concat([lengthBuffer, messageBuffer]));
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
}

export const p2pNode = new P2PNode();
