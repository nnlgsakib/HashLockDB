import app from './app';
import { p2pNode } from './p2p/p2p';
import { findAvailablePort } from './../src/utils/port-finder'; // Import the port finder function

const startServer = async () => {
    // Ensure the P2P server is listening
    await new Promise<void>((resolve) => {
        p2pNode.server.once('listening', () => {
            resolve();
        });
    });

    // Define default and other ports for the HTTP server
    const DEFAULT_HTTP_PORT = 3000;
    let HTTP_PORT = DEFAULT_HTTP_PORT;

    // Find an available port for the HTTP server
    try {
        HTTP_PORT = await findAvailablePort(DEFAULT_HTTP_PORT);
       // console.log(`Selected available port for HTTP server: ${HTTP_PORT}`);
    } catch (err) {
        console.error('Error finding an available port for HTTP server:', err);
        return;
    }

    // Start the HTTP server on the found port
    app.listen(HTTP_PORT, () => {
        console.log(`HTTP Server is running on port ${HTTP_PORT}`);
    });
};

startServer();
