export interface Item {
  id: number;
  title: string;
  done: boolean;
}

const ITEMS_BY_USER = new Map<string, Item[]>([
  [
    'user-1',
    [
      { id: 1, title: 'Read the technical test', done: true },
      { id: 2, title: 'Build the OAuth flow', done: true },
      { id: 3, title: 'Open the pull request', done: false },
    ],
  ],
  [
    'user-2',
    [
      { id: 1, title: 'Rotate the JWT secret', done: false },
      { id: 2, title: 'Review the auth server logs', done: true },
    ],
  ],
]);

export function itemsFor(userId: string): Item[] {
  return ITEMS_BY_USER.get(userId) ?? [];
}
