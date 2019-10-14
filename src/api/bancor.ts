import axios from 'axios'

const bancor = axios.create({
  baseURL: 'https://api.bancor.network/0.1/'
})

async function apiBancor(endpoint: string, params: any) {
  try {
    return await bancor.get(endpoint, {
      params: params
    })
  } catch (error) {
    throw error
  }
}

export default apiBancor
