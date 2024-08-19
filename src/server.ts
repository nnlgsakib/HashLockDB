import app from './app';
import { p2pNode } from './p2p/p2p';

const startServer = async () => {
    await new Promise<void>((resolve) => {
        p2pNode.server.once('listening', () => {
            resolve();
        });
    });

    // Use a fixed or different random port for the HTTP server
    const HTTP_PORT = 8081; // Change this to any valid port that is not used by P2P

    app.listen(HTTP_PORT, () => {
        console.log(`HTTP Server is running on port ${HTTP_PORT}`);
    });
};

startServer();
