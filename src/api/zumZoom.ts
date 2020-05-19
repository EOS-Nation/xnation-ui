import axios, { AxiosResponse } from "axios";
import parse from "csv-parse/lib/sync";

const baseUrl = "https://zumzoom.github.io/analytics/";

interface RawRow {
  timestamp: string;
  ROI: string;
  "Token Price": string;
  "Trade Volume": string;
}

interface Row {
  timestamp: string;
  roi: string;
  tokenPrice: string;
  tradeVolume: string;
}

export const fetchSmartTokens = async () => {
  const res = await axios.get<{ results: { id: string; text: string }[] }>(
    `${baseUrl}/bancor/data/tokens.json?_type=query`
  );
  return res.data.results;
};

export const fetchSmartTokenHistory = async (smartToken: string) => {
  const res = await axios.get<string>(
    `${baseUrl}/bancor/data/roi/${smartToken}.csv`
  );
  return res.data;
};

const parseSmartTokenHistory = (csvString: string): Row[] => {
  const data: RawRow[] = parse(csvString, { columns: true });
  return data.map(row => ({
    timestamp: row.timestamp,
    roi: row.ROI,
    tokenPrice: row["Token Price"],
    tradeVolume: row["Trade Volume"]
  }));
};

export const getSmartTokenHistory = async (smartToken: string) => {
  const history = await fetchSmartTokenHistory(smartToken);
  const parsed = parseSmartTokenHistory(history);
  return parsed;
};
