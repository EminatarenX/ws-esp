import express from "express";
import { Server, Socket } from "socket.io";

import cors from "cors";

export class ServerWebSocket{
  private io?: Server;
  private app?: express.Application;
  private server?: any;

  public constructor() {}

  public start() {
    if (!this.app) {

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      this.app = express();
      this.app.use(cors({
        origin: frontendUrl,
        credentials: true,
      }));
      this.app.use(express.json());
      
      this.server = this.app.listen(4001 || Number(process.env.PORT), () => {
        console.log("Server is running on port 4001");
      }); 

      this.io = new Server(this.server, {
        cors: {
          origin: frontendUrl,
          credentials: true,
        },
        pingTimeout: 60000,
        connectionStateRecovery: {
          maxDisconnectionDuration: 2 * 60 * 1000,
          skipMiddlewares: true
        } 
      });

      this.setupConnectionHandlers();
    }
  }

  private computeUserIdFromHeaders(headers: any) {
    return headers['user-id'];  
  }

  private async setupConnectionHandlers() {
    if (!this.io) return;
    this.io.use(async (socket, next) => {
      socket.data.userId = await this.computeUserIdFromHeaders(socket.handshake.headers)
      
      next()
    })
    this.io.on("connection", (socket: Socket) => {
        // console.log("user connected");

      socket.on("room", (roomId: string) => {
        socket.join(roomId);
        socket.emit("subscribe", roomId);
      })

      socket.on('subscribed', (data: {room: string, message: any}) => {
        this.io?.to(data.room).emit('room', data.message);
      })

      socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId)
      })


      socket.on("disconnect", () => {
        socket.rooms.size === 0 && 
        socket.disconnect();
      });
    });
  }

  

  public emitToRoom(roomId: string, event: string, payload: any) {
    if (!this.io) {
      throw new Error("Server not initialized");
    }
    this.io.to(roomId).emit(event, payload);
  }
}

