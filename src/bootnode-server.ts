import net from 'net';

interface Peer {
    id: string;
    host: string;
    port: number;
    socket: net.Socket;
}

class BootnodeServer {
    private peers: Peer[] = [];

    constructor(private port: number) {
        this.startServer();
    }

    private startServer() {
        const server = net.createServer((socket) => this.handleConnection(socket));

        server.listen(this.port, () => {
            console.log(`Bootnode server running on port ${this.port}`);
        });

        server.on('error', (err) => {
            console.error('Bootnode server error:', err);
        });
    }

    private handleConnection(socket: net.Socket) {
        console.log('New peer connected');
        let buffer = Buffer.alloc(0);

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);
            while (buffer.length > 0) {
                try {
                    // Try to parse the buffer content as JSON
                    const message = this.decodeMessage(buffer);

                    if (message) {
                        this.handleMessage(socket, message);
                        // Reset the buffer after successful parsing
                        buffer = Buffer.alloc(0);
                    } else {
                        // Exit the loop if the message is incomplete
                        break;
                    }
                } catch (error:any) {
                    console.error('Error parsing message:', error.message);
                    // Clear the buffer if there's an error, to avoid repeated issues
                    buffer = Buffer.alloc(0);
                }
            }
        });

        socket.on('close', () => {
            this.removePeer(socket);
        });

        socket.on('error', (err) => {
            console.error('Connection error:', err);
            this.removePeer(socket);
        });
    }

    private decodeMessage(buffer: Buffer): any | null {
        try {
            // Check if the buffer contains a full message
            const message = buffer.toString('utf8');
            return JSON.parse(message);
        } catch (error) {
            // Return null if the buffer does not contain a complete JSON message
            return null;
        }
    }

    private handleMessage(socket: net.Socket, message: any) {
        try {
            switch (message.type) {
                case 'REGISTER':
                    this.registerPeer(message.id, message.host, message.port, socket);
                    break;
                case 'REQUEST_FILE':
                    this.forwardFileRequest(message.hash, socket);
                    break;
                case 'FILE_RESPONSE':
                    this.forwardFileResponse(message.data, socket);
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    private registerPeer(id: string, host: string, port: number, socket: net.Socket) {
        const peerExists = this.peers.find(peer => peer.id === id);
        if (!peerExists) {
            this.peers.push({ id, host, port, socket });
            console.log(`Registered new peer: ${id} (${host}:${port})`);
        }
    }

    private forwardFileRequest(hash: string, requesterSocket: net.Socket) {
        // Find the peer that holds the requested file
        const fileHolder = this.peers.find(peer => peer.socket !== requesterSocket);

        if (fileHolder) {
            // Forward the request to the node holding the file
            const request = JSON.stringify({ type: 'REQUEST_FILE', hash });
            fileHolder.socket.write(request);

            // Relay the response back to the requesting node
            fileHolder.socket.on('data', (data) => {
                const message = this.decodeMessage(data);
                if (message && message.type === 'FILE_RESPONSE') {
                    requesterSocket.write(data);
                }
            });
        } else {
            // No peer holds the file
            requesterSocket.write(JSON.stringify({ type: 'FILE_NOT_FOUND' }));
        }
    }

    private forwardFileResponse(data: any, requesterSocket: net.Socket) {
        // Forward the file data to the requester
        const response = JSON.stringify({ type: 'FILE_RESPONSE', data });
        requesterSocket.write(response);
    }

    private removePeer(socket: net.Socket) {
        this.peers = this.peers.filter(peer => peer.socket !== socket);
        console.log('Peer disconnected, updated peer list.');
    }
}

// Start the bootnode server on a specific port (e.g., 4000)
const bootnodePort = 4000;
new BootnodeServer(bootnodePort);
