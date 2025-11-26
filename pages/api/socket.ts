import { NextApiRequest, NextApiResponse } from 'next';

// This API route is kept for compatibility but the actual socket.io server
// is now running in server.js for proper WebSocket support
const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  // Socket.io is handled by the custom server (server.js)
  // This endpoint just returns a message
  res.status(200).json({ message: 'Socket.IO server is running. Please connect via WebSocket.' });
};

export default SocketHandler;
