import net from 'net';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from './../utils/db';
import { decryptData } from './../utils/encryption';
import { findAvailablePort } from './../utils/port-finder'; // Import the port finder function

interface Peer {
    host: string;
    port: number;
}

class P2PNode {
    private nodeId: string;
    private peers: Peer[] = [];
    public server: net.Server;
    public port: number;

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
            console.log(`Selected available port: ${this.port}`);
        } catch (err) {
            console.error('Error finding an available port:', err);
            throw err; // Rethrow the error to handle it in initializeNode
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
                console.error(`Error with peer ${peer.host}:${peer.port}:`, err);
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

        socket.on('error', (err) => {
            console.error('Connection error:', err);
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
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    private async handleGetFile(hash: string, socket: net.Socket) {
        try {
            const encryptedMetadata = await db.get(hash);
            if (encryptedMetadata) {
                const metadataStr = decryptData(encryptedMetadata, hash);
                const metadata = JSON.parse(metadataStr);
                const decryptedData = decryptData(metadata.data, hash);
                this.sendMessage(socket, 'FILE_FOUND', {
                    metadata,
                    data: decryptedData
                });
            } else {
                this.sendMessage(socket, 'FILE_NOT_FOUND', {});
            }
        } catch (error) {
            console.error('Error retrieving file:', error);
            this.sendMessage(socket, 'ERROR', { message: 'Error retrieving file' });
        }
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
        } catch (error) {
            console.log('File not found locally, searching peers...');
        }

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
                                    } else {
                                        reject(new Error('Unexpected response from peer'));
                                    }
                                } catch (error) {
                                    reject(error);
                                }
                                buffer = buffer.slice(length + 4);
                            } else {
                                break;
                            }
                        }
                    });

                    client.on('error', (err) => {
                        console.error(`Error connecting to peer ${peer.host}:${peer.port}:`, err);
                        resolve(null);
                    });
                });

                if (result) {
                    return result;
                }
            } catch (error) {
                console.error('Error getting file from peer:', error);
            }
        }

        return null;
    }

    private sendMessage(socket: net.Socket, type: string, data: any) {
        const message = JSON.stringify({ type, ...data });
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32BE(message.length, 0);
        const messageBuffer = Buffer.from(message, 'utf8');
        socket.write(Buffer.concat([lengthBuffer, messageBuffer]));
    }
}

export const p2pNode = new P2PNode();
