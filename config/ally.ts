import Env from "@ioc:Adonis/Core/Env";
import { AllyConfig } from "@ioc:Adonis/Addons/Ally";

const allyConfig: AllyConfig = {
  google: {
    driver: "google",
    clientId: Env.get("GOOGLE_CLIENT_ID"),
    clientSecret: Env.get("GOOGLE_CLIENT_SECRET"),
    callbackUrl: "http://localhost:3333/google/callback",
  },
  twitter: {
    driver: "twitter",
    clientId: Env.get("TWITTER_CLIENT_ID"),
    clientSecret: Env.get("TWITTER_CLIENT_SECRET"),
    callbackUrl: "http://localhost:3333/twitter/callback",
  },
  discord: {
    driver: "discord",
    clientId: Env.get("DISCORD_CLIENT_ID"),
    clientSecret: Env.get("DISCORD_CLIENT_SECRET"),
    callbackUrl: "http://localhost:3333/discord/callback",
  },
  linkedin: {
    driver: "linkedin",
    clientId: Env.get("LINKEDIN_CLIENT_ID"),
    clientSecret: Env.get("LINKEDIN_CLIENT_SECRET"),
    callbackUrl: "http://localhost:3333/linkedin/callback",
  },
  facebook: {
    driver: "facebook",
    clientId: Env.get("FACEBOOK_CLIENT_ID"),
    clientSecret: Env.get("FACEBOOK_CLIENT_SECRET"),
    callbackUrl: "http://localhost:3333/facebook/callback",
  },
  spotify: {
    driver: "spotify",
    clientId: Env.get("SPOTIFY_CLIENT_ID"),
    clientSecret: Env.get("SPOTIFY_CLIENT_SECRET"),
    callbackUrl: "http://localhost:3333/spotify/callback",
  },
};

export default allyConfig;
