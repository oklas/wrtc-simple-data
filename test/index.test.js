var service = require('../src/service')

var io

beforeEach(() => {
  io = service()
});

afterEach(() => {
  io.close()
})


test('two plus two is four', () => {
  expect(2 + 2).toBe(4);
});

