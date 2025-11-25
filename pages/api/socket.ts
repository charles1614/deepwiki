import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Client } from 'ssh2';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket) {
    res.end();
    return;
  }

  const socket = res.socket as any;

  if (socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Socket is initializing');
  const io = new SocketIOServer(socket.server as NetServer, {
    path: '/api/socket',
    addTrailingSlash: false,
  });
  socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('New client connected');
    let sshClient: Client | null = null;
    let stream: any = null;

    socket.on('ssh-connect', (config) => {
      console.log('Received ssh-connect request', { ...config, password: '***' });
      try {
        if (sshClient) {
          sshClient.end();
        }

        sshClient = new Client();

        sshClient.on('ready', () => {
          // Setup SFTP first
          sshClient?.sftp((err, sftp) => {
            if (err) {
              console.error('SFTP error:', err);
              socket.emit('ssh-error', 'SFTP failed: ' + err.message);
              return;
            }

            // Remove existing listeners to prevent duplicates
            socket.removeAllListeners('sftp-list');
            socket.removeAllListeners('sftp-read');

            socket.on('sftp-list', (path) => {
              sftp.readdir(path, (err, list) => {
                if (err) {
                  socket.emit('sftp-error', err.message);
                  return;
                }
                // Add isDirectory property to help frontend
                const processedList = list.map(item => ({
                  ...item,
                  isDirectory: item.attrs.mode !== undefined ? (item.attrs.mode & 0o40000) === 0o40000 : false
                }));
                socket.emit('sftp-list-result', { path, list: processedList });
              });
            });

            socket.on('sftp-read', (path) => {
              sftp.readFile(path, (err, content) => {
                if (err) {
                  socket.emit('sftp-error', err.message);
                  return;
                }
                socket.emit('sftp-read-result', { path, content: content.toString('utf-8') });
              });
            });

            // Setup Shell
            sshClient?.shell((err, s) => {
              if (err) {
                socket.emit('ssh-error', err.message);
                return;
              }

              stream = s;

              stream.on('close', () => {
                socket.emit('ssh-close');
                sshClient?.end();
              });

              stream.on('data', (data: any) => {
                socket.emit('ssh-data', data.toString('utf-8'));
              });

              stream.stderr.on('data', (data: any) => {
                socket.emit('ssh-data', data.toString('utf-8'));
              });

              // Emit ready only after both SFTP and Shell are set up
              socket.emit('ssh-ready');
            });
          });

        }).on('error', (err) => {
          console.error('SSH Client Error:', err);
          socket.emit('ssh-error', err.message);
        }).on('close', () => {
          socket.emit('ssh-close');
        });

        const port = parseInt(config.port);
        if (isNaN(port) || port < 0 || port >= 65536) {
          socket.emit('ssh-error', 'Invalid port number');
          return;
        }

        sshClient.connect({
          host: config.host,
          port: port,
          username: config.username,
          password: config.password,
        });
      } catch (err: any) {
        console.error('Error in ssh-connect handler:', err);
        socket.emit('ssh-error', 'Internal server error during connection: ' + err.message);
      }
    });

    socket.on('ssh-disconnect', () => {
      if (sshClient) {
        sshClient.end();
        sshClient = null;
        socket.emit('ssh-close');
      }
    });

    socket.on('ssh-data', (data) => {
      if (stream) {
        stream.write(data);
      }
    });

    socket.on('ssh-resize', ({ cols, rows }) => {
      if (stream) {
        stream.setWindow(rows, cols, 0, 0);
      }
    });

    socket.on('disconnect', () => {
      if (sshClient) {
        sshClient.end();
      }
      console.log('Client disconnected');
    });
  });

  res.end();
};

export default SocketHandler;
