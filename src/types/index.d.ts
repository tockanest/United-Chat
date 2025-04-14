// src/types/index.d.ts
/// <reference path="./chat.d.ts" />
/// <reference path="./editor.d.ts" />
/// <reference path="./streams.d.ts" />
/// <reference path="./user.d.ts" />

import type * as app from "@tauri-apps/api/app";

declare global {
    interface Window {
        __TAURI__: {
            app?: typeof app;
        };
    }
}

export { };