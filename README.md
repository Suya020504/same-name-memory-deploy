# 같은 이름, 다른 기억 지도 사이트

단일 HTML로 제작된 발표/지도 자료를 도메인 배포가 가능한 정적 사이트 구조로 정리한 폴더입니다.

## 주소 구조

- `/` 또는 `/index.html`: 발표/지도 선택 화면
- `/presentation.html`: 원본 발표용 HTML의 앞 이미지 슬라이드 기반 발표 전용 화면
- `/map.html`: 지도 전용 화면

발표 페이지는 원본 발표용 HTML 앞부분의 이미지 슬라이드 10장을 사용하고, 지도 시연으로 넘어가는 버튼과 내부 지도 영역은 제거했습니다. 지도는 `/map.html`에서만 별도로 열립니다.

## 로컬 확인

```bash
npm run build
npm run start
```

열리는 주소:

```text
http://127.0.0.1:4174
http://127.0.0.1:4174/presentation.html
http://127.0.0.1:4174/map.html
```

기능 검증:

```bash
npm run verify
```

## Vercel 배포 설정

- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: 비워 두거나 기본값 사용

실제 배포와 도메인 연결은 Vercel/GitHub 계정 작업이 필요하므로, 계정 로그인과 외부 업로드 전에 별도 확인이 필요합니다.
