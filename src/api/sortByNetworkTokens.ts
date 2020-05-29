export const sortByNetworkTokens = <T>(arr: T[], selector: (item: T) => string, order: string[]) => {
  return arr.sort((a, b) => {
    const aSymbol = selector(a);
    const bSymbol = selector(b);

    const aSymbolRank = order.findIndex(symbol => symbol == aSymbol);
    const bSymbolRank = order.findIndex(symbol => symbol == bSymbol);

    return bSymbolRank - aSymbolRank;
  })
};
