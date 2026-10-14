---
title: "iOS 백그라운드 화면 스냅샷 노출"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Storage]
tags: [ios, app-switcher, snapshot, information-disclosure]
description: "앱이 백그라운드로 갈 때 iOS가 저장하는 화면 스냅샷에 민감정보가 남아 앱 전환기에서 노출되는 문제의 개념과 확인 관점을 정리합니다."
mermaid: true
---

> iOS는 앱이 백그라운드로 전환될 때 현재 화면의 스냅샷을 찍어 앱 전환기(App Switcher) 미리보기로 쓰고 디스크에 저장한다. 그 화면에 잔액·개인정보·토큰이 보이면 스냅샷으로 노출된다.

## 개념

- 앱이 비활성화되는 순간(`sceneWillResignActive`) 화면이 그대로 캡처된다. 민감정보 화면이 떠 있으면 그 상태가 스냅샷에 남는다.
- 스냅샷은 앱 샌드박스 내 캐시에 파일로 저장되므로, 단말 접근 시 열람 가능하다.
- 올바른 구현은 비활성화 시점에 블러/가림 뷰를 덮어 민감 화면이 캡처되지 않게 한다. 그 처리가 없으면 노출 지점이다.

```swift
// 가림 처리가 있는지 확인 대상 (없으면 민감 화면 그대로 캡처됨)
func sceneWillResignActive(_ scene: UIScene) { /* blur overlay? */ }
```

## 공격·확인 구문

허가된 단말에서만.

### 스냅샷 확인

```
1) 민감정보가 보이는 화면을 띄운다
2) 홈으로 나가 앱을 백그라운드로 전환
3) 앱 전환기 미리보기에 민감정보가 그대로 보이는지 확인
4) 샌드박스 내 스냅샷 캐시 파일을 열어 저장된 이미지 확인
   Library/Caches/Snapshots/ 하위
```

### 확인 관점

```
백그라운드 전환 시 가림(블러/스플래시) 처리가 없는가
앱 전환기 미리보기에 잔액·개인정보·입력값이 보이는가
저장된 스냅샷 파일에 민감 화면이 남는가
```

## 참고 자료

- [OWASP MASTG: Testing Auto-Generated Screenshots](https://mas.owasp.org/MASTG/techniques/ios/)
- [OWASP MASVS: Platform (MASVS-PLATFORM)](https://mas.owasp.org/MASVS/07-MASVS-PLATFORM/)
- [CWE-200: Exposure of Sensitive Information](https://cwe.mitre.org/data/definitions/200.html)
