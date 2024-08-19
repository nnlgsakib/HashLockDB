import net from 'net';

// Function to check if a port is in use
function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err:any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // Port is in use
            } else {
                resolve(false); // Some other error occurred
            }
        });
        server.once('listening', () => {
            server.close(() => resolve(false)); // Port is not in use
        });
        server.listen(port);
    });
}

// Function to find an available port starting from a given port number
async function findAvailablePort(startPort: number, maxRetries: number = 100): Promise<number> {
    let port = startPort;
    for (let i = 0; i < maxRetries; i++) {
        if (!(await isPortInUse(port))) {
            return port; // Port is available
        }
        port += 1; // Try next port
    }
    throw new Error('No available ports found');
}

export { findAvailablePort };
