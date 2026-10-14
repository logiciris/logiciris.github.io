---
title: "정보 노출 점검표: 오류·주석·백업·디버그 응답"
date: 2026-10-16 10:00:00 +0900
categories: [Web Security, Information Disclosure]
tags: [information-disclosure, error-handling, debug, checklist, web, pentest]
description: "오류 메시지, 소스 주석, 백업·개발 페이지, 디버그 응답, 허용 메서드까지 정보 노출을 순서대로 점검하는 방법과 대응을 정리합니다."
mermaid: true
---

> 정보 노출은 그 자체로 끝나는 취약점이 아니라 **다음 공격의 지도**입니다. 내부 경로, 버전, 계정 형식, 숨은 페이지가 드러나면 그다음 진단과 공격이 훨씬 쉬워집니다.

## 이런 분께

- 진단 초반에 어디부터 훑어야 할지 순서가 필요한 분
- 배포 전 점검 목록을 만드는 개발자·운영자
- 오류 처리와 디버그 설정을 리뷰하는 분

## 1. 원리: 개발 편의 기능이 운영에 남는다

노출의 대부분은 새 기능이 아니라 **개발 때 쓰던 것이 운영에 남은 것**입니다. 자세한 오류 화면, 디버그 모드, 주석, 백업 파일, 테스트 페이지가 대표적입니다.

```mermaid
flowchart LR
    D["개발 편의 기능"] --> M["정리 누락"]
    M --> E["노출 정보"]
    E --> I["내부 구조 파악"]
    I --> N["다음 단계 공격 선택"]
```

## 2. 취약한 코드 → 고친 코드

최소 Flask 예제입니다.

```python
# vulnerable.py
from flask import Flask

app = Flask(__name__)
app.config["DEBUG"] = True            # 운영에 디버그 모드

@app.get("/user/<uid>")
def user(uid):
    row = db.query(f"SELECT * FROM users WHERE id={uid}")   # 별도 결함
    return {"user": row, "query": f"SELECT * FROM users WHERE id={uid}"}  # 쿼리까지 응답
```

- 디버그 모드는 예외 시 스택과 소스 일부를 화면에 보여 줍니다.
- 응답에 내부 쿼리를 실어 구조를 알려 줍니다.

고친 예시입니다.

```python
# fixed.py
import logging
from flask import Flask, jsonify

app = Flask(__name__)
app.config["DEBUG"] = False
log = logging.getLogger("app")

@app.errorhandler(Exception)
def handle(e):
    log.exception("unhandled")                         # 상세는 서버 로그에만
    return jsonify(error="internal error"), 500        # 응답은 일반 문구

@app.get("/user/<int:uid>")
def user(uid):
    row = db.get_user(uid)                             # 파라미터화된 조회
    return {"user": {"id": row.id, "name": row.name}}  # 필요한 필드만
```

- 오류 **상세는 로그**, 사용자에게는 **일반 문구**만 줍니다.
- 응답 필드는 허용 목록으로 골라 내부 컬럼이 딸려 나가지 않게 합니다.

## 3. 확인 방법(진단 순서)

허가된 범위에서 아래 순서로 봅니다. 각 단계는 "무엇을 보면 노출인가"가 기준입니다.

1. **오류 응답**: 존재하지 않는 경로, 잘못된 타입, 빈 값을 보냅니다. 스택 트레이스, 프레임워크·버전, 서버 절대 경로, 쿼리 문구가 보이면 노출입니다.
2. **응답 헤더·배너**: `Server`, `X-Powered-By` 등으로 상세 버전이 드러나는지 확인합니다.
3. **페이지 소스·정적 파일**: HTML 주석, 개발자 메모, 내부 주소, 소스맵(`.map`)과 번들에 남은 키·엔드포인트를 봅니다.
4. **숨은 경로**: `robots.txt`, `sitemap.xml`, 문서화되지 않은 관리·테스트·개발 페이지가 응답하는지 봅니다.
5. **백업·임시 파일**: 원본 파일명에 백업 확장자가 붙은 사본이나 편집기 임시 파일이 내려오는지 확인합니다. 소스가 실행되지 않고 **텍스트로 내려오면** 노출입니다.
6. **디렉터리 목록**: 폴더 경로에서 파일 목록이 보이는지 봅니다.
7. **허용 메서드**: `OPTIONS` 응답이나 오류 메시지로 불필요한 메서드(`PUT`, `DELETE`, `TRACE`)가 열려 있는지 봅니다.
8. **디버그·상태 엔드포인트**: 프레임워크가 제공하는 상태·환경 정보 화면이 인증 없이 열려 있는지 봅니다.
9. **기록**: 노출된 정보가 **다음 공격에 어떻게 쓰일지**를 한 줄씩 적어 심각도를 판단합니다.

> **실무 포인트** 노출 한 건만으로는 낮은 등급이어도, 보고서에는 **연결 시나리오**를 같이 쓰세요. 예를 들어 버전 노출은 해당 버전의 알려진 취약점 확인으로, 내부 경로 노출은 경로 조작 시험의 정확도로, 숨은 관리 페이지는 인증 점검 대상으로 이어집니다. 연결을 보여 주면 우선순위가 올라갑니다.

> **실무 포인트** 점검 때 **오류 응답이 두 종류인 곳**을 놓치지 마세요. 로그인 실패가 "없는 사용자"와 "비밀번호 틀림"으로 갈리면 계정 존재 여부가 드러납니다. 메시지 문구뿐 아니라 응답 시간, 길이, 상태 코드 차이도 같은 노출입니다.

## 4. 유형·변형

| 유형 | 원리 | 확인 포인트 |
|---|---|---|
| 상세 오류 | 예외 정보가 응답에 포함 | 잘못된 입력에서 스택·경로·쿼리가 보이는가 |
| 배너·버전 | 헤더와 오류 페이지에 버전 명시 | 불필요한 상세가 제거됐는가 |
| 주석·소스맵 | 개발 메모, 원본 소스, 내부 주소 잔존 | 배포 산출물에 포함되는가 |
| 백업·임시 파일 | 사본이 웹 루트에 남음 | 확장자가 바뀐 사본이 내려오는가 |
| 숨은 페이지 | 링크는 없지만 경로는 열림 | 인증 없이 응답하는가 |
| 디렉터리 목록 | 폴더 인덱스 노출 | 서버 설정에서 꺼져 있는가 |
| 계정 열거 | 오류 문구·시간 차이 | 성공과 실패의 응답이 구별되지 않는가 |
| 과다 응답 | 객체 전체를 직렬화 | 응답 필드가 필요한 것으로 제한되는가 |

## 5. 대응 방안

### 코드 수준
- 전역 예외 처리기에서 **상세는 로그, 응답은 일반 문구**로 분리합니다.
- 응답 객체는 허용 필드만 명시적으로 선택합니다.
- 로그인·복구 등의 오류 문구와 응답 시간을 성공/실패 간에 가깝게 맞춥니다.

### 설정 수준
- 운영 환경에서 디버그 모드, 상태·환경 화면, 디렉터리 목록, 불필요한 HTTP 메서드를 끕니다.
- 서버 배너와 버전 헤더를 최소화합니다.
- 소스맵은 운영에 올리지 않거나 접근을 제한합니다.

### 구조 수준
- 배포 파이프라인에서 **백업·임시 파일·주석 잔존 검사**를 자동화합니다.
- 웹 루트에는 배포 산출물만 두고 소스·백업은 별도 위치에 보관합니다.

## 6. 점검 체크리스트

- [ ] 운영에서 디버그 모드가 꺼져 있는가
- [ ] 오류 응답이 일반 문구이고 상세는 서버 로그에만 남는가
- [ ] 서버 배너·버전 헤더가 최소화됐는가
- [ ] HTML 주석과 소스맵에 내부 정보가 없는가
- [ ] `robots.txt`와 문서화되지 않은 경로가 인증 없이 열리지 않는가
- [ ] 백업·임시 파일이 웹 루트에 없는가
- [ ] 디렉터리 목록이 꺼져 있는가
- [ ] 불필요한 HTTP 메서드가 막혀 있는가
- [ ] 로그인·복구 오류 문구가 계정 존재 여부를 알려 주지 않는가
- [ ] API 응답이 필요한 필드만 포함하는가

## 7. 함께 보기

- [경로 조작(Path Traversal)](/notes/path-traversal/)
- [SQL 인젝션](/notes/sql-injection/)
- [깨진 접근 제어와 IDOR](/notes/broken-access-control-idor/)

## 8. 참고 자료

- [OWASP WSTG: Testing for Improper Error Handling](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/08-Testing_for_Error_Handling/01-Testing_For_Improper_Error_Handling)
- [OWASP Cheat Sheet Series: Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [CWE-200: Exposure of Sensitive Information to an Unauthorized Actor](https://cwe.mitre.org/data/definitions/200.html)
- [CWE-209: Generation of Error Message Containing Sensitive Information](https://cwe.mitre.org/data/definitions/209.html)
- [CWE-215: Insertion of Sensitive Information Into Debugging Code](https://cwe.mitre.org/data/definitions/215.html)
