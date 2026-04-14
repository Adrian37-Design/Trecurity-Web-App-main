export default (millis: number) => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, millis);
  });
}
