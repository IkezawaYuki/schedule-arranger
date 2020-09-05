'use strict';

const request = require('supertest');
const app = require("../app")
const passportStab = require("passport-stub");


describe('/login', () => {

  beforeAll(() => {
    passportStab.install(app);
    passportStab.login({username: "testuser"});
  });

  afterAll(() => {
    passportStab.logout();
    passportStab.uninstall(app);
  });

  test('ログイン時はユーザー名が表示される', () => {
    return request(app)
    .get('/login')
    .expect(/testuser/)
    .expect(200);
  });

  test('ログインのためのリンクが含まれる', () => {
    return request(app)
    .get('/login')
    .expect('Content-Type', 'text/html; charset=utf-8')
    .expect(/<a href="\/auth\/github"/)
    .expect(200);
  });

  test('ログアウト後はホームディレクトリにリダイレクトされる', () => {
    return request(app)
    .get('/logout')
    .expect('Location', '/')
    .expect(302);
  })
});