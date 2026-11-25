import data from'./catalog-revisions.json'with{type:'json'};

type Revision=(typeof data.revisions)[keyof typeof data.revisions];
export const CATALOG_CHECKED_AT=data.checkedAt;
export const CATALOG_REVISIONS:Readonly<Record<string,Revision>>=data.revisions;
export function catalogRevision(id:string):Revision|undefined{return Object.hasOwn(CATALOG_REVISIONS,id)?CATALOG_REVISIONS[id]:undefined;}
export function battleRevision(id:string):Revision|undefined{return Object.values(CATALOG_REVISIONS).find(r=>r.battleId===id);}
