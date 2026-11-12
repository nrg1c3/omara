import { expect, test } from '@playwright/test';
import { buildBody, configureApi, endpointOf } from '../src/api';
import { normalizeDigits, onlyDigits, parseAmount } from '../src/lib/digits';
import { formatMoney, formatMonth } from '../src/lib/format';
import { dataUrlBytes } from '../src/lib/image';
import { parseHash, routeToHash } from '../src/router';

test('الأرقام العربي', () => {
  expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  expect(normalizeDigits('۰۱۲۳')).toBe('0123');
  expect(onlyDigits('٤٨ ٢٧-١٩٣٠')).toBe('48271930');
  expect(parseAmount('١٬٢٥٠')).toBe(1250);
  expect(parseAmount('1,250.50')).toBe(1250.5);
  expect(parseAmount('١٢٫٥')).toBe(12.5);
  expect(parseAmount('abc')).toBeNull();
  expect(parseAmount('')).toBeNull();
});

test('التنسيق', () => {
  expect(formatMoney(18450)).toBe('18,450 ج.م');
  expect(formatMonth('2026-11')).toBe('نوفمبر 2026');
});

test('التوجيه بالـ hash', () => {
  expect(parseHash('')).toEqual({ name: 'login' });
  expect(parseHash('#c=48271930')).toEqual({ name: 'code', code: '48271930' });
  expect(parseHash('#guard')).toEqual({ name: 'guard' });
  expect(parseHash('#nrg')).toEqual({ name: 'nrg' });
  expect(parseHash('#r/ledger')).toEqual({ name: 'resident', tab: 'ledger', sub: undefined });
  expect(parseHash('#a/xyz')).toEqual({ name: 'admin', tab: 'home', sub: undefined });
  expect(parseHash('#s=legacy-session')).toEqual({ name: 'login' });
  expect(routeToHash({ name: 'admin', tab: 'units', sub: '12' })).toBe('#a/units/12');
});

test('العميل: endpoint وtoken وrole بيتضافوا صح', () => {
  configureApi({ getToken: () => 'T', getRole: () => 'a', onSessionExpired: () => {} });
  expect(endpointOf('a_pay')).toBe('api');
  expect(endpointOf('x_vote')).toBe('x');
  expect(endpointOf('y_report')).toBe('y');
  // الدخول من غير توكن
  expect(buildBody('r_login', { code: '1' })).toEqual({ action: 'r_login', code: '1' });
  // omara-api: token بس
  expect(buildBody('a_notice', { title: 'a', body: 'b' })).toEqual({ action: 'a_notice', title: 'a', body: 'b', token: 'T' });
  // omara-x/y: token + role
  expect(buildBody('x_view', {})).toEqual({ action: 'x_view', token: 'T', role: 'a' });
  expect(buildBody('y_plan_cancel', { plan_no: 'L1' })).toEqual({ action: 'y_plan_cancel', plan_no: 'L1', token: 'T', role: 'a' });
  // الأمن وNRG: token من غير role
  expect(buildBody('y_guard_check', { code: 'AB12CD' })).toEqual({ action: 'y_guard_check', code: 'AB12CD', token: 'T' });
  expect(buildBody('y_nrg_login', { key: 'k' })).toEqual({ action: 'y_nrg_login', key: 'k' });
});

test('حجم الـ data URL', () => {
  expect(dataUrlBytes('data:image/jpeg;base64,QUJD')).toBe(3);
  expect(dataUrlBytes('data:image/jpeg;base64,QUI=')).toBe(2);
});
