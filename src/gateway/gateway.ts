import type { Data, Maybe } from "../helper/types";
import type {
  Auth,
  GotOptions,
  GotResponse,
  Query,
  RateLimit,
  SomeResponse,
} from "./types";

import got from "got";

/**
 * The gateway to the Reddit api.
 *
 * You shouldn't have to use this directly. If you end up needing this class in
 * order to interact with the Reddit API please open an issue or submit a pull
 * request so we can add official support for your use case.
 */
export abstract class Gateway {
  protected rateLimit: Maybe<RateLimit>;
  protected userAgent: string;
  protected endpoint: string;

  /** @internal */
  constructor(endpoint: string, userAgent: string) {
    this.endpoint = endpoint;
    this.userAgent = userAgent;
  }

  /**
   * Issue a GET request to the Reddit API.
   *
   * You can use this method, but you most likely don't want to. If you end up
   * needing this method in order to interact with the Reddit API please open an
   * issue or submit a pull request so we can add official support for your use
   * case.
   *
   * @internal
   *
   * @param path The path to GET.
   * @param query The query params.
   * @returns The result.
   */
  public async get<T>(path: string, query: Query = {}): Promise<T> {
    const options = await this.buildOptions(query);
    const response: T = await got.get(this.mapPath(path), options).json();
    return this.unwrap(response);
  }

  /**
   * Issue a POST request to the Reddit API with x-www-form-urlencoded data.
   *
   * You can use this method, but you most likely don't want to. If you end up
   * needing this method in order to interact with the Reddit API please open an
   * issue or submit a pull request so we can add official support for your use
   * case.
   *
   * @internal
   *
   * @param path The path to POST.
   * @param form The data to POST.
   * @param query The query params.
   * @returns The result.
   */
  public async post<T>(
    path: string,
    form: Data,
    query: Query = {}
  ): Promise<T> {
    const formOptions = { form: { api_type: "json", ...form } };
    return await this.doPost(path, formOptions, query);
  }

  /**
   * Issue a POST request to the Reddit API with json data.
   *
   * You can use this method, but you most likely don't want to. If you end up
   * needing this method in order to interact with the Reddit API please open an
   * issue or submit a pull request so we can add official support for your use
   * case.
   *
   * @internal
   *
   * @param path The path to POST.
   * @param json The data to POST.
   * @param query The query params.
   * @returns The result.
   */
  public async postJson<T>(
    path: string,
    json: Data,
    query: Query = {}
  ): Promise<T> {
    const jsonOptions = { json: { api_type: "json", ...json } };
    return await this.doPost(path, jsonOptions, query);
  }

  protected abstract auth(): Promise<Maybe<Auth>>;

  protected async doPost<T>(
    path: string,
    options: GotOptions,
    query: Query
  ): Promise<T> {
    const baseOptions = await this.buildOptions(query);
    const response: T = await got
      .post(this.mapPath(path), { ...baseOptions, ...options })
      .json();
    return this.unwrap(response);
  }

  protected abstract mapPath(path: string): string;

  protected handleError(message: string, description?: string): never {
    let errorMessage = `Reddit returned an error: ${message}`;
    if (description) errorMessage += `: ${description}`;
    throw new Error(errorMessage);
  }

  protected unwrap<T>(response: SomeResponse<T>): T {
    if (typeof response !== "object") {
      return response;
    } else if ("json" in response) {
      const { errors, data } = response.json;
      if (errors.length > 0) {
        this.handleError(errors[0]);
      } else {
        return data!;
      }
    } else {
      if ("error" in response) {
        this.handleError(response.error, response.error_description);
      } else {
        return response;
      }
    }
  }

  protected async buildOptions(query: Query): Promise<GotOptions> {
    const options: GotOptions = {
      prefixUrl: this.endpoint,
      headers: { "user-agent": this.userAgent },
      searchParams: { ...query, raw_json: 1, api_type: "json" },
      hooks: { afterResponse: [r => this.updateRatelimit(r)] },
    };

    const auth = await this.auth();
    if (auth) {
      if ("bearer" in auth) {
        options.headers!["Authorization"] = `bearer ${auth.bearer}`;
      } else {
        options.username = auth.user;
        options.password = auth.pass;
      }
    }

    return options;
  }

  protected updateRatelimit(response: GotResponse): GotResponse {
    const { headers } = response;
    const remain = parseInt(headers["x-ratelimit-remaining"] as string);
    const reset = parseInt(headers["x-ratelimit-reset"] as string) * 1000;
    this.rateLimit = { remaining: remain, reset: Date.now() + reset };
    return response;
  }
}
