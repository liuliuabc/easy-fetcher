export enum RequestMethod {
    GET = "GET",
    POST = "POST",
    PATCH = "PATCH",
    PUT = "PUT",
    DELETE = "DELETE",
    OPTIONS = "OPTIONS",
    HEAD = "HEAD",
    TEACE = "TEACE"
}

export class FetchError extends Error {
    constructor(public message: string, public status: number) {
        super(message);
    }
}

export enum DataType {
    JSON,
    TEXT,
    BLOB,
    ORIGIN,
}

export type ParamType = {
    [key: string]: any
};

export interface IRequestData {
    query?: ParamType;
    headers?: ParamType;
    body?: ParamType;
    originBody?: ParamType;
    baseUrl?: string;
    dataType?: DataType;
    baseRequestBody?: ParamType;
    method?: string;
    timeout?: number;
    pathId?: number | string;
    path?: string;
    debug?: boolean;
}

export function deepAssign(targetOrigin: any, ...rest: any[]) {
    for (const target of rest) {
        for (const key in target) {
            const value = target[key];
            const valueIsObject = typeof value === "object";
            if (targetOrigin.hasOwnProperty(key)) {
                const isSameType = typeof targetOrigin[key] === typeof value;
                if (isSameType && typeof value === "object" && !(value instanceof Array)) {
                    targetOrigin[key] = deepAssign(targetOrigin[key], value);
                } else {
                    targetOrigin[key] = value;
                }
            } else {
                targetOrigin[key] = valueIsObject ? JSON.parse(JSON.stringify(value)) : value;
            }
        }

    }
    return targetOrigin;
}

export default class Fetcher {
    public rejectIntercept?: (e: FetchError) => any;
    public resolveIntercept?: (result: any) => any;
    public beforeRequestIntercept?: (obj: { url: string; body: any }) => { url: string; body: any };

    constructor(public baseUrl = "",
                public baseRequestBody: ParamType = {},
                public dataType = DataType.JSON,
                public timeout = 7000, public debug = false) {
    }

    post<T>(requestData: IRequestData = {}) {
        requestData.method = RequestMethod.POST;
        return this.execute<T>(requestData);
    }

    get<T>(requestData: IRequestData = {}) {
        requestData.method = RequestMethod.GET;
        delete requestData.body;
        return this.execute<T>(requestData);
    }

    patch<T>(requestData: IRequestData = {}) {
        requestData.method = RequestMethod.PATCH;
        return this.execute<T>(requestData);
    }

    put<T>(requestData: IRequestData = {}) {
        requestData.method = RequestMethod.PUT;
        return this.execute<T>(requestData);
    }

    options<T>(requestData: IRequestData = {}) {
        requestData.method = RequestMethod.OPTIONS;
        return this.execute<T>(requestData);
    }

    head<T>(requestData: IRequestData = {}) {
        requestData.method = RequestMethod.HEAD;
        delete requestData.body;
        return this.execute<T>(requestData);
    }

    teace<T>(requestData: IRequestData = {}) {
        requestData.method = RequestMethod.TEACE;
        return this.execute<T>(requestData);
    }

    delete<T>(requestData: IRequestData = {}) {
        requestData.method = RequestMethod.DELETE;
        return this.execute<T>(requestData);
    }

    private parseResponse(response: Response,dataType:DataType) {
        switch (dataType) {
            case DataType.JSON:
                return response.json();
            case DataType.TEXT:
                return response.text();
            case DataType.BLOB:
                return response.blob();
            case DataType.ORIGIN:
                return response;
        }
    }

    private queryToUrl(query?: ParamType) {
        if (!query) {
            return "";
        }
        let str = "";
        for (const key in query) {
            str += `${key}=${query[key]}&`;
        }
        if (str.endsWith("&")) {
            return str.substring(0, str.length - 1);
        } else {
            return str;
        }
    }

    private url(baseUrl: string, path: string = "", pathId: string | number = "", query?: ParamType) {
        // 对url格式做个兼容
        let url = "";
        if (!path || !baseUrl) {
            url = path ? path : baseUrl;
        } else if (baseUrl.endsWith("/") && path.startsWith("/")) {
            url = baseUrl + path.substring(1);
        } else if (baseUrl.endsWith("/") || path.startsWith("/")) {
            url = baseUrl + path;
        } else {
            url = baseUrl + "/" + path;
        }
        if (pathId) {
            if (url.endsWith("/")) {
                url += pathId;
            } else {
                url += "/" + pathId;
            }
        }
        const queryStr = this.queryToUrl(query);
        return queryStr ? `${url}?${queryStr}` : url;
    }

    private logInfo(debug: boolean, ...rest: any[]) {
        debug && console.info(...rest);
    }

    private logErr(debug: boolean, ...rest: any[]) {
        debug && console.error(...rest);
    }

    private execute<T>(requestData: IRequestData = {}) {
        const {
            timeout = this.timeout, body:formBody, pathId,
            path, query, method = RequestMethod.GET,dataType=this.dataType, baseRequestBody = this.baseRequestBody, baseUrl = this.baseUrl, headers = {}, debug=this.debug, originBody
        } = requestData;
        this.logInfo(debug, `fetcher:requestData=`, Object.assign({}, requestData));
        return new Promise<T>((resolve, reject) => {
            let finish = false;
            let status = -1;
            const timer = setTimeout(() => {
                if (!finish) {
                    finish = true;
                    const error = new FetchError("网络请求超时", status);
                    if (this.rejectIntercept) {
                        reject(this.rejectIntercept(error));
                    } else {
                        reject(error);
                    }
                }
            }, timeout);
            let body: any = {
                headers,
                method,
                body:  formBody? JSON.stringify(formBody) : null,
            };
            this.logInfo(debug, `fetcher:origin-body=`, Object.assign({}, body));
            body = deepAssign({}, baseRequestBody, body);
            if (originBody) {
                body.body = originBody;
            }
            this.logInfo(debug, `fetcher:deepAssign-body=`, Object.assign({}, body));
            const url = this.url(baseUrl, path, pathId, query)
            this.logInfo(debug, `fetcher:url=${url}`);
            let promise = null;
            if (this.beforeRequestIntercept) {
                const {url: changeUrl = url, body: changeBody = body} = this.beforeRequestIntercept({url, body});
                promise = fetch(changeUrl, changeBody);
            } else {
                promise = fetch(url, body);
            }
            promise.then((response) => {
                status = response.status;
                this.logInfo(debug, `fetcher:status=${status}`);
                return this.parseResponse(response,dataType);
            }).then((result) => {
                if (!finish) {
                    finish = true;
                    timer && clearTimeout(timer);
                    this.logInfo(debug, `fetcher:result=`, result);
                    if (this.resolveIntercept) {
                        try {
                            resolve(this.resolveIntercept(result) as T);
                        } catch (e) {
                            if (this.rejectIntercept) {
                                reject(this.rejectIntercept(e as FetchError));
                            } else {
                                reject(e);
                            }
                        }
                    } else {
                        resolve(result as T);
                    }
                }
            }).catch((error: Error) => {
                this.logErr(debug, `fetcher:error=`, error);
                if (!finish) {
                    finish = true;
                    timer && clearTimeout(timer);
                    if (status >= 0) {
                        error = new FetchError("数据解析失败", status);
                    } else {
                        error = new FetchError("网络连接失败", status);
                    }
                    if (this.rejectIntercept) {
                        reject(this.rejectIntercept(error as FetchError));
                    } else {
                        reject(error);
                    }
                }
            });
        });
    }
}
