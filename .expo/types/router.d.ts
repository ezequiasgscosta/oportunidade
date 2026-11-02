/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/admin`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `/auth/callback`; params?: Router.UnknownInputParams; } | { pathname: `/info/[page]`, params: Router.UnknownInputParams & { page: string | number; } };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/admin`; params?: Router.UnknownOutputParams; } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `/auth/callback`; params?: Router.UnknownOutputParams; } | { pathname: `/info/[page]`, params: Router.UnknownOutputParams & { page: string; } };
      href: Router.RelativePathString | Router.ExternalPathString | `/admin${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | `/auth/callback${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString | Router.ExternalPathString | `/admin` | `/` | `/_sitemap` | `/auth/callback`; params?: Router.UnknownInputParams; } | `/info/${Router.SingleRoutePart<T>}` | { pathname: `/info/[page]`, params: Router.UnknownInputParams & { page: string | number; } };
    }
  }
}
