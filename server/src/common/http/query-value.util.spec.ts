import { singleQueryString } from './query-value.util';

describe('singleQueryString', () => {
  it('passes a plain string through', () => {
    expect(singleQueryString('brand')).toBe('brand');
  });

  it('takes the first value when a param is repeated', () => {
    expect(singleQueryString(['a', 'b'])).toBe('a');
  });

  it('drops an object, which is what `?role[x]=1` produces', () => {
    // The case that matters: an object reaching `role?.toUpperCase()` throws
    // and returns a 500 from a URL anyone can construct.
    expect(singleQueryString({ x: '1' })).toBeUndefined();
    expect(singleQueryString([{ x: '1' }])).toBeUndefined();
  });

  it('treats blank and absent alike', () => {
    expect(singleQueryString('')).toBeUndefined();
    expect(singleQueryString([''])).toBeUndefined();
    expect(singleQueryString(undefined)).toBeUndefined();
    expect(singleQueryString(null)).toBeUndefined();
  });

  it('drops other scalars rather than coercing them', () => {
    expect(singleQueryString(1)).toBeUndefined();
    expect(singleQueryString(true)).toBeUndefined();
  });
});
