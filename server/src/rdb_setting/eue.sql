/*
    # EUE Server Database Schema

    1. LOCDO
        - 행정구역 도/특별시/특별자치시 이름과 코드 저장
        - LOCSIGUNGU와 LOCINFO에 참조됨

    2. LOCSIGUNGU
        - 행정구역 시/군/구 이름과 코드 저장
        - LOCDO를 참조
        - LOCINFO에 참조됨

    3. LOCINFO
        - 행정구역 읍/면/동 이름과 코드 및 날씨 정보 URL 저장
        - LOCDO와 LOCSIGUNGU를 참조

    4. USER
        - 사용자 ID, PassWord, 거주지역코드, 데이터 URL 저장
        - LOCINFO를 참조
*/

CREATE TABLE LOCDO
(
    CODE INT NOT NULL,
    DONAME VARCHAR(20) NOT NULL,
    PRIMARY KEY(CODE)
);

CREATE TABLE LOCSIGUNGU
(
    CODE INT NOT NULL,
    DOCODE INT NOT NULL,
    SGGNAME VARCHAR(20) NOT NULL,
    PRIMARY KEY(CODE),
    FOREIGN KEY(DOCODE) REFERENCES LOCDO(CODE) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE LOCINFO
(
    CODE INT NOT NULL,
    DOCODE INT NOT NULL,
    SGGCODE INT NOT NULL,
    EMDNAME VARCHAR(20) NOT NULL,
    DATALINK TEXT,
    PRIMARY KEY(CODE),
    FOREIGN KEY(DOCODE) REFERENCES LOCDO(CODE) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY(SGGCODE) REFERENCES LOCSIGUNGU(CODE) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE USER
(
    ID VARCHAR(20) UNIQUE NOT NULL,
    PW VARCHAR(20) NOT NULL,
    LOCCODE INT NOT NULL,
    DATALINK TEXT,
    PRIMARY KEY(ID),
    FOREIGN KEY(LOCCODE) REFERENCES LOCINFO(CODE) ON UPDATE CASCADE ON DELETE RESTRICT
);