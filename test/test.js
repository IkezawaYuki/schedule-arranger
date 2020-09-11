'use strict';

const request = require('supertest');
const app = require("../app")
const passportStab = require("passport-stub");
const User = require('../models/user');
const Candidate = require('../models/candidate');


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
  });

  test('予定が作成でき、表示できる', (done) => {
    User.upsert({ userId: 0, username: 'test'}).then(() => {
      request(app)
      .post('/schedules')
      .send(
        {
          scheduleName: '予定１',
          memo: 'テストメモ1\r\nテストメモ2',
          candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3'
        })
        .expect('Location', /schedules/)
        .expect(302)
        .end((err, res) => {
          const createdSchedulePath = res.headers.location;
          request(app)
          .get(createdSchedulePath)
          .expect(/走る/)
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);

            const scheduleId = createdSchedulePath.split('/schedules/')[1];
            Candidate.findAll({
              where: { scheduleId: scheduleId}
            }).then(candidates => {
              const promises = candidates.map(c => {
                return c.destroy();
              });
              Promise.all(promises).then(() => {
                Schedule.findByPk(scheduleId).then(s => {
                  s.destroy().then(() => {
                    if (err) return done(err);
                    done();
                  });
                });
              });
            });
          });
        });
    });
  });
});