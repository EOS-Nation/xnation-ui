import { bancorApi } from './bancor'

export interface BancorWrapper {
    getTokens(): Promise<any>
}

class BaseApi {

    apis: any[]

    constructor(apis: any[]) {
        this.apis = apis;
        console.log(this.apis, 'is the apis')
    }

    public async getTokens(): Promise<any> {
        return Promise.all(this.apis.filter(api => api.getTokens))
    }
}

export const baseApi = bancorApi