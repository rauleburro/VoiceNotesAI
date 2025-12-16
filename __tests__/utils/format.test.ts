import { formatDuration, getExcerpt, formatDate } from '@/utils/format';

describe('formatDuration', () => {
  it('formats zero milliseconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds correctly', () => {
    expect(formatDuration(5000)).toBe('0:05');
    expect(formatDuration(30000)).toBe('0:30');
    expect(formatDuration(59000)).toBe('0:59');
  });

  it('formats minutes correctly', () => {
    expect(formatDuration(60000)).toBe('1:00');
    expect(formatDuration(90000)).toBe('1:30');
    expect(formatDuration(300000)).toBe('5:00');
  });

  it('formats longer durations', () => {
    expect(formatDuration(3600000)).toBe('60:00'); // 1 hour
    expect(formatDuration(3661000)).toBe('61:01');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(61000)).toBe('1:01');
    expect(formatDuration(65000)).toBe('1:05');
    expect(formatDuration(69000)).toBe('1:09');
  });
});

describe('getExcerpt', () => {
  it('returns placeholder for null text', () => {
    expect(getExcerpt(null)).toBe('No transcript yet...');
  });

  it('returns full text when under limit', () => {
    expect(getExcerpt('Hello world')).toBe('Hello world');
  });

  it('truncates long text with ellipsis', () => {
    const longText = 'A'.repeat(100);
    const result = getExcerpt(longText, 80);
    expect(result.length).toBeLessThanOrEqual(83); // 80 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('respects custom max length', () => {
    const text = 'Hello world, this is a longer string';
    expect(getExcerpt(text, 10)).toBe('Hello worl...');
  });
});

describe('formatDate', () => {
  it('formats today as time', () => {
    const now = new Date();
    const result = formatDate(now.getTime());
    // Should contain time format (xx:xx)
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats yesterday correctly', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatDate(yesterday.getTime());
    expect(result).toBe('Yesterday');
  });

  it('formats older dates as month and day', () => {
    const oldDate = new Date('2023-06-15');
    const result = formatDate(oldDate.getTime());
    // Should contain month abbreviation and day
    expect(result).toMatch(/Jun\s+15/);
  });
});
