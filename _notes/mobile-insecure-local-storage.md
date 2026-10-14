---
title: "모바일 로컬 저장소 민감정보 노출"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Storage]
tags: [android, ios, insecure-storage, keychain, keystore]
description: "앱 전용 디렉터리·설정 파일·키체인에 평문으로 남는 자격증명·토큰을 찾는 모바일 로컬 저장소 점검의 개념과 grep 구문을 정리합니다."
mermaid: true
---

> 앱은 설정·토큰·캐시를 단말 로컬에 저장한다. 비밀번호·세션 토큰·키가 **평문**이나 약한 인코딩으로 남으면, 단말 접근(루팅/탈옥·백업·포렌식)만으로 탈취된다. 앱 샌드박스 경로를 뒤져 비밀값 패턴을 찾는다.

## 개념

- **Android**: 앱 데이터는 `/data/data/<package>` 아래(SharedPreferences XML, SQLite DB, 파일). 민감값이 평문으로 저장되는지 전체를 재귀 grep.
- **iOS**: 앱 데이터는 `/private/var/mobile/Containers/Data/Application/<UUID>` 아래. UUID가 많으면 **수정 시각 최신순**으로 정렬해 대상 앱 컨테이너를 찾고, `Library/Preferences/`까지 들어가 확인한다.
- **키체인/키스토어**: 올바른 구현은 비밀값을 OS 키체인(iOS)·Keystore(Android)에 넣는다. 평문 파일에 있으면 취약, 키체인에 있어도 보호 수준(`WhenUnlocked`, 하드웨어 백업 여부)을 본다.

## 공격·확인 구문

허가된 단말에서만. `<secret>`은 찾을 비밀값 패턴.

### Android 샌드박스 grep

```bash
adb shell
cd /data/data/com.example.app
grep -rinoE '<secret>' *

# 특정 폴더 제외
grep -rinoE '<secret>' ./ --exclude-dir=<dir>
```

### iOS 컨테이너 탐색

```bash
# 컨테이너 경로 (UUID는 수정 최신순으로 대상 특정)
/private/var/mobile/Containers/Data/Application/<UUID>
grep -rinoE '<secret>' *
# Library/Preferences/ 까지 확인하면 어느 앱 컨테이너인지 확정

# mac 에서 접근: Finder 이동 > sftp://<device-ip>  또는 Cyberduck
```

### 확인 관점

```
SharedPreferences/plist 에 비밀번호·토큰 평문?
SQLite DB 컬럼에 자격증명 평문?
키체인/키스토어 미사용, 또는 약한 접근 보호 속성?
```

## 참고 자료

- [OWASP MASTG: Data Storage](https://mas.owasp.org/MASTG/techniques/)
- [OWASP MASVS: Storage (MASVS-STORAGE)](https://mas.owasp.org/MASVS/05-MASVS-STORAGE/)
- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
