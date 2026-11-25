# 깃허브 페이지 배포

사이트에는 **페이지에서 실제로 쓰는 파일만** 골라 올린다.
도구(`tools/`)와 아티팩트 묶음(`dist/`, `preview.html`)은 저장소에는 있어도 사이트에는 게시되지 않는다.

내부 작업 자료는 공개 저장소에 아예 넣지 않고 이 컴퓨터에만 둔다(`.gitignore`).
- 기획안 `plan/` (참고 사이트 이미지 포함)
- 시안·이미지 생성 프롬프트 `design/`
- 예전 판 `_archive/`
- 서체 비교 페이지 `fonts-compare.html`

## 깃허브에 올리기 (`publish` 브랜치)

작업 브랜치의 예전 기록에는 위 내부 자료가 들어 있다.
그래서 공개용으로는 기록 없이 지금 모습 한 번만 담은 `publish` 브랜치를 올린다.

- 저장소: https://github.com/KyungrimCha/hojono (공개)
- 사이트: https://hojono.com/ (예전 주소 kyungrimcha.github.io/hojono, www.hojono.com은 여기로 넘어감)
- 도메인: 가비아 DNS. A 레코드 `@` 4개(185.199.108~111.153), CNAME `www` → `kyungrimcha.github.io.`
  - 저장소를 클라이언트 계정으로 옮기면: 저장소 Settings → Pages에 `hojono.com`을 다시 넣고, 가비아의 `www` CNAME만 `클라이언트아이디.github.io.`로 바꾼다(A 레코드는 그대로).
- 이 컴퓨터의 `origin`이 위 저장소로 연결되어 있고, `publish` 브랜치가 저장소의 `main`으로 올라간다.

나중에 고친 내용을 다시 올릴 때는 작업 브랜치에서 커밋한 뒤 `publish`에 새 모습을 한 번 더 담아 올린다.
공개 커밋에는 개인 메일 대신 깃허브 가림 주소(noreply)를 쓴다.

```
git checkout publish
git checkout stage1/skeleton-to-source -- .
git -c user.email=76684108+KyungrimCha@users.noreply.github.com commit -m "업데이트"
git push origin publish:main
git checkout stage1/skeleton-to-source
```

작업 브랜치에서 지운 파일은 위 방법으로는 `publish`에서 지워지지 않으니 `git rm`으로 따로 지운다.

## 깃허브 페이지 설정 (2026-11-21 완료)

1. 저장소 **Settings → Pages → Build and deployment → Source**가 **GitHub Actions**로 되어 있다.
2. `main`에 올리면 `.github/workflows/pages.yml`이 자동으로 배포한다.
   Actions 탭에서 "깃허브 페이지 배포"를 직접 실행해도 된다.
3. 주소: `https://<아이디>.github.io/<저장소 이름>/`

## 배포 때 하는 일 (`tools/build-site.js`)

- 공개 페이지 3개에서 쓰는 파일만 `_site/`로 복사
  - `index.html` (메인)
  - `privacy/` (개인정보 처리방침)
  - `objects/sanjicheon-rollup-bag/` (제품 상세)
- 쓰는데 없는 파일이 있으면 배포를 멈추고 알려 줌
- 공유 미리보기 이미지(`img/og.jpg`)와 주소를 실제 배포 주소로 바꿔 넣음
- 페이지에서 쓰지 않아 빠진 파일 목록을 보여 줌

## 올리기 전에 확인

```
node tools/build-site.js
```

결과는 `_site/`(저장소에는 올리지 않음). 약 18MB, 파일 45개.
모든 경로가 상대 경로라 `/<저장소 이름>/` 아래에서도 그대로 동작한다.

## 메모

- 공유 미리보기 이미지: `img/og.jpg` (1200×630, 쪼꼬미 영상 9.4초 장면: 네 친구가 함께 있는 모습)
- 탭 아이콘: `img/favicon.png` (64×64, 귤배(파랑새 쪼꼬미) 얼굴)
- 소식받기·흔적 남기기는 클라이언트 구글 시트로 받는다. 설정 방법과 시트용 스크립트: `tools/sheet/README.md`, `tools/sheet/Code.gs`
  2026-11-25 연결 완료: 클라이언트와 함께 쓰는 구글 드라이브의 시트 "HOJONO 사이트 접수"(탭: 흔적 남기기, 소식받기),
  앱스 스크립트 프로젝트 "HOJONO 사이트 접수"(웹 앱, 이 시트만 다루는 권한). 받는 주소는 `js/fx-objects-trace.js`의 `SHEET_URL`.
  스크립트는 지금 개발자(디자인공도) 구글 계정 권한으로 실행된다. 클라이언트 계정으로 넘길 때는 클라이언트 계정에서 README대로 다시 배포하고 새 주소로 바꾼다.
  `SHEET_URL`을 비우면 시안 모드(아무것도 보내지 않고 "시안 화면이라 실제로 신청되지는 않아요"로 안내).
- 개인정보처리자: PSW, 문의 pswjeju@gmail.com (메인 처리방침 모달과 privacy/ 두 곳)
- 보름달 연회 프롤로그는 유튜브 일부 공개 영상(yZenKcavBog)을 youtube-nocookie로 넣는다. 영상을 바꾸면 js/fx-views-feast.js의 아이디만 바꾸면 됨
