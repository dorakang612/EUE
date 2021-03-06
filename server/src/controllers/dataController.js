import fs from "fs";
import fetch from "node-fetch";
import { serverMSG, statusCode } from "../serverinfo";
import { pool as db, dbMSG, pool } from "../db";
import dotenv from "dotenv";

dotenv.config();

const OUT = "Out";
const IN = "In";

const OUTSIDE = "Outside";
const USERS = "Users";

// 데이터 수집 기로 부터 받아온 지역 코드 세분화
const locCodeSep = (code = "") => {
  const DO = code.slice(0, 2);
  const SGG = code.slice(0, 5);
  const EMD = code;

  const loc = {
    DO: DO,
    SGG: SGG,
    EMD: EMD,
  };

  return loc;
};

// 데이터가 들어온 시간 데이터 생성
const getTimeInfo = () => {
  const cur = new Date();

  const year = cur.getFullYear();
  const month = cur.getMonth() + 1;
  const date = cur.getDate();
  const hour = cur.getHours();
  const minute = cur.getMinutes();

  const time = {
    year: year,
    month: month,
    date: date,
    hour: hour,
    minute: minute,
  };

  return time;
};

// Data 접근 경로 반환, DB에 존재 하지 않을 시 Update 동작
const getDataDIR = async (loc, time, type, id) => {
  const year = time.year;
  const month = time.month < 10 ? `0${time.month}` : time.month;
  const date = time.date < 10 ? `0${time.date}` : time.date;

  const select_query =
    "SELECT DATALINK" +
    " " +
    `FROM ${type === OUT ? "LOCINFO" : "USER"}` +
    " " +
    `WHERE ${type === OUT ? `CODE=${loc.EMD}` : `ID='${id}'`}`;

  const [row, fields] = await db.execute(select_query);

  let baseDIR;
  if (row.length != 0) baseDIR = row[0]["DATALINK"];
  else baseDIR = null;

  // DB에 Data 저장 경로가 존재하지 않을 시 UPDATE
  if (baseDIR === null) {
    baseDIR =
      "/data" +
      `/${loc.DO}` +
      `/${loc.SGG}` +
      `/${loc.EMD}` +
      `/${type === OUT ? OUTSIDE : USERS + "/" + id}`;

    const update_query =
      `UPDATE ${type === OUT ? "LOCINFO" : "USER"}` +
      " " +
      `SET DATALINK='${baseDIR}'` +
      " " +
      `WHERE ${type === OUT ? `CODE=${loc.EMD}` : `ID='${id}'`}`;

    db.execute(update_query);
  }

  const timeDIR = `/${year}` + `/${year}${month}` + `/${year}${month}${date}`;

  // 최종 Data 저장소 경로
  const repoDIR = process.env.LOCAL_SERVER_DIR + baseDIR + timeDIR;

  return repoDIR;
};

// 데이터를 파일 형식으로 저장
const storeData = (type, time, loc, fdir, data) => {
  const fileName = "weather.csv";

  fs.open(fdir + `/${fileName}`, "a", (err, fd) => {
    if (err) {
      // Directory가 존재하지 않는 경우, 생성
      if (err.code === "ENOENT") {
        console.log("There is no directory.");

        fs.mkdirSync(fdir, { recursive: true }, (err) => {
          if (err) console.log(err);
        });

        console.log("Create directory.");
      }
      // 그 외의 에러는 출력
      else console.log(err);
    }

    fs.appendFile(fdir + `/${fileName}`, data, (err) => {
      if (err) console.log(err);
      else
        console.log(
          `${time.year}/${time.month}/${time.date} ${time.hour}:${
            time.minute
          } - ${loc.EMD} ${type === OUT ? OUTSIDE : USERS} data append.`
        );
    });
  });
};

// 외부 수집기로 부터 들어온 정보 처리
const handleOutData = async (locCode, lat, lng) => {
  // OpenWeatherAPI로 부터 지역의 날씨 정보획득을 위해 지역의 경도와 위도, API Key, 단위 기준 metric 전달
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`
  );
  const json = await response.json();

  const temp = json["main"]["temp"];
  const humi = json["main"]["humidity"];
  const press = json["main"]["pressure"];
  const wind_speed = json["wind"]["speed"];

  const loc = locCodeSep(locCode);
  const time = getTimeInfo();

  const fdir = await getDataDIR(loc, time, OUT, OUTSIDE);

  const data = `${time.month},${time.date},${time.hour},${time.minute},${temp},${humi},${press},${wind_speed}\n`;

  storeData(OUT, time, loc, fdir, data);
};

// 내부 수집기로 부터 들어온 정보 처리
const handleInData = async (id, locCode, temp, humi, lights) => {
  const loc = locCodeSep(locCode);
  const time = getTimeInfo();

  const fdir = await getDataDIR(loc, time, IN, id);
  // 데이터 형식 - [ 월 | 일 | 시 | 분 | 온도 | 습도 | 광도 ]
  const data = `${time.month},${time.date},${time.hour},${time.minute},${temp},${humi},${lights}\n`;

  storeData(IN, time, loc, fdir, data);
};

// 데이터 수신 처리
export const getDataInput = (req, res) => {
  try {
    if (req.query.type === OUT) {
      // 외부 데이터 수집기
      const {
        query: { locCode, lat, lng },
      } = req;

      handleOutData(locCode, lat, lng);
    } else {
      // 내부 데이터 수집기 동작
      const {
        query: { id, locCode, temp, humi, lights },
      } = req;

      handleInData(id, locCode, temp, humi, lights);
    }

    res.status(statusCode.ok).send(serverMSG.server_ok);
  } catch (error) {
    console.log(error);
    res.status(statusCode.err).send(serverMSG.server_err);
  }
};

// 사용자의 데이터 가져오기 및 예측 값 전송
export const getUserData = (req, res) => {
  const {
    params: { id },
  } = req;

  res.status(statusCode.ok).send(serverMSG.server_ok);
};
