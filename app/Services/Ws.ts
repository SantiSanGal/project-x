// app/Services/Ws.ts
import { Server } from "socket.io";
import AdonisServer from "@ioc:Adonis/Core/Server";

class Ws {
  public io: Server;
  private booted = false;

  public boot() {
    if (this.booted) return;
    this.booted = true;

    this.io = new Server(AdonisServer.instance!, {
      cors: {
        origin: [
          "https://tatakaepixel.com",
          "https://www.tatakaepixel.com",
          "http://localhost:3000",
          "http://localhost:5173",
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
      path: "/socket.io",
    });
  }
}

export default new Ws();
