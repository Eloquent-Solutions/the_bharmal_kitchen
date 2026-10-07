export function formatRecordId(id) {
  const value = String(id || '');
  const uuid = /^([A-Z]+)-([0-9a-f]{8})-([0-9a-f]{4})-[0-9a-f-]+$/i.exec(value);
  return uuid ? `${uuid[1]}-${uuid[2]}${uuid[3]}` : value;
}
