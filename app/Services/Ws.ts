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
          "https://superapi.tatakaepixel.com",
          "https://tatakaepixel.com",
          "http://localhost:3000", // si usas otro puerto
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
      // path: "/socket.io", // (opcional, default)
    });
  }
}

export default new Ws();
