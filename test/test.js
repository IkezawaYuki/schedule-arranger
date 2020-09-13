'use strict';

const request = require('supertest');
const app = require("../app")
const passportStab = require("passport-stub");
const User = require('../models/user');
const Candidate = require('../models/candidate');
const Schedule = require('../models/schedule');
const Availability = require('../models/availability');


describe('/login', () => {

  beforeAll(() => {
    passportStab.install(app);
    passportStab.login({id: 0, username: "testuser"});
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

  test('予定が作成でき、表示できる', (done) => {
    User.upsert({ userId: 0, username: 'test'}).then(() => {
      request(app)
      .post('/schedules')
      .send(
        {
          scheduleName: 'テスト予定1',
          memo: 'テストメモ1\r\nテストメモ2',
          candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3'
        })
        .expect('Location', /schedules/)
        .expect(302)
        .end((err, res) => {
          const createdSchedulePath = res.headers.location;
          request(app)
          .get(createdSchedulePath)
          .expect(/テスト予定1/)
          .expect(200)
          .end((err, res) => {
            deleteScheduleAggregate(createdSchedulePath.split('/schedules/')[1], done, err);
          });
        });
    });
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
});

describe('/schedules/:scheduleId/users/:userId/candidates/:candidateId', () => {
  beforeAll(() => {
    passportStab.install(app);
    passportStab.login({id: 0, username: "testuser"});
  });

  afterAll(() => {
    passportStab.logout();
    passportStab.uninstall(app);
  });

  test('出欠確認ができる', (done) => {
    User.upsert({userId: 0, username: 'testuser'}).then(() => {
      request(app)
      .post('/schedules')
      .send({scheduleName: 'テスト出欠予定更新１', memo: 'テスト出欠更新めも１', candidates: 'テスト出欠更新候補１'})
      .end((err, res) => {
        const createdSchedulePath = res.headers.location;
        const scheduleId = createdSchedulePath.split('/schedules/')[1];
        Candidate.findOne({
          where: {scheduleId: scheduleId}
        }).then((candidate) => {
          const userId = 0;
          request(app)
          .post(`/schedules/${scheduleId}/users/${userId}/candidates/${candidate.candidateId}`)
          .send({availability: 2})
          .expect('{"status":"OK","availability":2}')
          .end((err, res) => {
            deleteScheduleAggregate(scheduleId, done, err);
          });
        });
      });
    });
  });
});

function deleteScheduleAggregate(scheduleId, done, err){
  Availability.findAll({
    where: {scheduleId: scheduleId}
  }).then((availabilities) => {
    const promises = availabilities.map((a) => { return a.destroy();});
    Promise.all(promises).then(() => {
      Candidate.findAll({
        where: {scheduleId: scheduleId}
      }).then((candidates) => {
        const promises = candidates.map((c) => { return c.destroy();});
        Promise.all(promises).then(() => {
          Schedule.findByPk(scheduleId).then((s) => {
            s.destroy().then(() => {
              if (err) return done(err);
              done();
            })
          })
        })
      })
    })
  })
}