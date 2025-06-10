/**
 * Config source: https://git.io/JfefZ
 *
 * Feel free to let us know via PR, if you find something broken in this config
 * file.
 */

import type { ValidatorConfig } from "@ioc:Adonis/Core/Validator";
import type { ProfilerConfig } from "@ioc:Adonis/Core/Profiler";
import type { LoggerConfig } from "@ioc:Adonis/Core/Logger";
import type { ServerConfig } from "@ioc:Adonis/Core/Server";
import rfs = require("rotating-file-stream");
import Env from "@ioc:Adonis/Core/Env";
import proxyAddr from "proxy-addr";
import { DateTime } from "luxon";
import { join } from "path";

/*
|--------------------------------------------------------------------------
| Application secret key
|--------------------------------------------------------------------------
|
| The secret to encrypt and sign different values in your application.
| Make sure to keep the `APP_KEY` as an environment variable and secure.
|
| Note: Changing the application key for an existing app will make all
| the cookies invalid and also the existing encrypted data will not
| be decrypted.
|
*/
export const appKey: string = Env.get("APP_KEY");

/*
|--------------------------------------------------------------------------
| Http server configuration
|--------------------------------------------------------------------------
|
| The configuration for the HTTP(s) server. Make sure to go through all
| the config properties to make keep server secure.
|
*/
export const http: ServerConfig = {
  /*
  |--------------------------------------------------------------------------
  | Allow method spoofing
  |--------------------------------------------------------------------------
  |
  | Method spoofing enables defining custom HTTP methods using a query string
  | `_method`. This is usually required when you are making traditional
  | form requests and wants to use HTTP verbs like `PUT`, `DELETE` and
  | so on.
  |
  */
  allowMethodSpoofing: false,

  /*
  |--------------------------------------------------------------------------
  | Subdomain offset
  |--------------------------------------------------------------------------
  */
  subdomainOffset: 2,

  /*
  |--------------------------------------------------------------------------
  | Request Ids
  |--------------------------------------------------------------------------
  |
  | Setting this value to `true` will generate a unique request id for each
  | HTTP request and set it as `x-request-id` header.
  |
  */
  generateRequestId: false,

  /*
  |--------------------------------------------------------------------------
  | Trusting proxy servers
  |--------------------------------------------------------------------------
  |
  | Define the proxy servers that AdonisJs must trust for reading `X-Forwarded`
  | headers.
  |
  */
  trustProxy: proxyAddr.compile("loopback"),

  /*
  |--------------------------------------------------------------------------
  | Generating Etag
  |--------------------------------------------------------------------------
  |
  | Whether or not to generate an etag for every response.
  |
  */
  etag: false,

  /*
  |--------------------------------------------------------------------------
  | JSONP Callback
  |--------------------------------------------------------------------------
  */
  jsonpCallbackName: "callback",

  /*
  |--------------------------------------------------------------------------
  | Cookie settings
  |--------------------------------------------------------------------------
  */
  cookie: {
    domain: "",
    path: "/",
    maxAge: "2h",
    httpOnly: true,
    secure: false,
    sameSite: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Force Content Negotiation
  |--------------------------------------------------------------------------
  |
  | The internals of the framework relies on the content negotiation to
  | detect the best possible response type for a given HTTP request.
  |
  | However, it is a very common these days that API servers always wants to
  | make response in JSON regardless of the existence of the `Accept` header.
  |
  | By setting `forceContentNegotiationTo = 'application/json'`, you negotiate
  | with the server in advance to always return JSON without relying on the
  | client to set the header explicitly.
  |
  */
  forceContentNegotiationTo: "application/json",
};

/*
|--------------------------------------------------------------------------
| Logger
|--------------------------------------------------------------------------
*/

// 1) Directorio de logs
const logDir = join(__dirname, "..", "logs");

// 2) Stream rotatorio (igual que antes)
const fileStream = rfs.createStream(
  (time, index) => {
    if (!time) return "app.log";
    const d = new Date(time);
    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `app-${yyyy}-${MM}-${dd}.log`;
  },
  {
    interval: "1d",
    path: logDir,
    maxFiles: 7,
    compress: "gzip",
  }
);

export const logger: LoggerConfig = {
  name: Env.get("APP_NAME"),
  enabled: true,
  level: Env.get("LOG_LEVEL", "info"),
  prettyPrint: false,

  // 3) Función custom para que time sea ISO en zona America/Asuncion
  timestamp: () => {
    const ts = DateTime.now()
      .setZone("America/Asuncion") // tu zona horaria
      .toISO({ suppressMilliseconds: false });
    // Note el leading comma / key wrapper que Pino espera
    return `,"time":"${ts}"`;
  },

  // 4) El stream rotatorio para el fichero
  stream: fileStream as any,
};

/*
|--------------------------------------------------------------------------
| Profiler
|--------------------------------------------------------------------------
*/
export const profiler: ProfilerConfig = {
  /*
  |--------------------------------------------------------------------------
  | Toggle profiler
  |--------------------------------------------------------------------------
  |
  | Enable or disable profiler
  |
  */
  enabled: true,

  /*
  |--------------------------------------------------------------------------
  | Blacklist actions/row labels
  |--------------------------------------------------------------------------
  |
  | Define an array of actions or row labels that you want to disable from
  | getting profiled.
  |
  */
  blacklist: [],

  /*
  |--------------------------------------------------------------------------
  | Whitelist actions/row labels
  |--------------------------------------------------------------------------
  |
  | Define an array of actions or row labels that you want to whitelist for
  | the profiler. When whitelist is defined, then `blacklist` is ignored.
  |
  */
  whitelist: [],
};

/*
|--------------------------------------------------------------------------
| Validator
|--------------------------------------------------------------------------
|
| Configure the global configuration for the validator. Here's the reference
| to the default config https://git.io/JT0WE
|
*/
export const validator: ValidatorConfig = {};
