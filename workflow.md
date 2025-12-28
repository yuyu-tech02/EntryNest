# EntryNest 開発ワークフロー（Phase0〜最終 / Docker不使用 / 進捗情報なし）

> 方針：ローカルは venv + npm、CIは GitHub Actions、デプロイは Render（Docker無し）。  
> 原則：各Phaseの最後に「動作確認」と「CIグリーン」を通してから次へ進む。

---

## Phase 0：土台
### 目的
開発・CI・同一ドメイン配信（SPA+API）を成立させ、今後の実装が“積むだけ”になる状態を作る。

### やること（具体）
- リポジトリ整備
  - `backend/ frontend/ docs/ scripts/` の構成確定
  - `main/dev` ブランチ運用開始（必要なら feature ブランチも）
- Backend（Django）
  - Django + DRF セットアップ
  - `/api/health` 実装
  - DB（Neon/PostgreSQL）接続設定、`migrate`
  - `.env` / 環境変数で `SECRET_KEY`, `DEBUG`, `DATABASE_URL` を設定可能に
- Frontend（React+Vite）
  - Vite React を作成
  - 開発時proxyで `/api/*` 疎通
  - build成果物をDjangoが配信（同一ドメイン化）
    - `backend/templates/frontend/index.html`
    - `backend/static/frontend/assets/`
- CI（GitHub Actions / Docker無し）
  - frontend: `npm ci` → `npm run build`
  - backend: `pip install -r requirements.txt` → `python manage.py check` → `python -m compileall .`

### 完了条件（DoD）
- `http://127.0.0.1:8000/` でSPA表示
- `http://127.0.0.1:8000/api/health` が200
- GitHub Actions が ✅（緑）で通る

---

## Phase 1：認証 & ユーザー分離（セキュリティ土台）
### 目的
「ログインできる」「ユーザーごとにデータが混ざらない」を最初に確定する。

### やること（具体）
- accounts（またはusers）アプリ作成
  - `UserSettings`（OneToOne）追加：`diff_enabled` を保持
- 認証API（セッション方式）
  - `POST /api/auth/login`（セッション確立）
  - `POST /api/auth/logout`
  - `GET /api/me`（ユーザー情報 + diff_enabled）
  - `PATCH /api/me/settings`（diff_enabled更新）
- CSRF対応（同一ドメイン前提）
  - CSRFトークン取得→フロントからヘッダ送付（Django流儀）
  - フロント `fetch(..., { credentials: "include" })` を徹底
- IDOR対策の“型”を作る（重要）
  - 以後の全ViewSet/QuerySetで `owner=request.user` の強制フィルタを固定

### 動作確認（例）
- ログイン→`/api/me` が自分の情報を返す
- `diff_enabled` が更新できる
- 未ログインで保護APIが 401/403 になる

### 完了条件（DoD）
- 認証API一式が動く
- セッション+CSRFが破綻しない
- 以後のCRUDを安全に積める状態

---

## Phase 2：Company CRUD（企業管理）
### 目的
企業ごとの「締切・ステータス・直近更新」を一覧で見えるようにする。

### やること（具体）
- モデル
  - `Company(owner, name, job_role, apply_route, deadline, status_text, memo, created_at, updated_at)`
- API（DRF）
  - `GET/POST /api/companies`
  - `GET/PATCH/DELETE /api/companies/{id}`
  - `get_queryset()` で `owner=request.user` を必ず強制
  - create時は `owner=request.user` をサーバ側で強制付与
- フロントUI
  - ダッシュボード：企業一覧表示（締切・ステータス・最終更新）
  - ソート（締切近い順など最低1つ）
  - 企業詳細：固定項目＋メモ表示、編集導線

### 動作確認（例）
- Aユーザーが作った企業がBユーザーから見えない
- CRUDが全て通る

### 完了条件（DoD）
- 企業一覧と詳細が最低限のUXで成立

---

## Phase 3：ESVersion 管理（ES版のCRUD）
### 目的
企業ごとにES本文を保存し、提出履歴（提出日/提出先/結果/メモ）を追えるようにする。

### やること（具体）
- モデル
  - `ESVersion(owner, company, body, submitted_at, submitted_via, result, memo, created_at, updated_at)`
  - `owner` は company 経由にせず **明示的に持つ**（安全重視）
- API（DRF）
  - `GET/POST /api/companies/{company_id}/es`
  - `GET/PATCH/DELETE /api/es/{id}`
  - company_id の参照も含めて `owner=request.user` を強制
- フロントUI
  - 企業詳細にES一覧（提出日/提出先/結果/更新日時）
  - ES作成/編集画面（本文テキスト + メタ情報）
  - 削除確認（最低限）

### 動作確認（例）
- 企業に紐づくESが作成/編集/削除できる
- 本文・メモがテキスト表示される（XSS回避）

### 完了条件（DoD）
- 「企業ごとにESを保存し履歴を追える」が成立

---

## Phase 4：差分（diff）
### 目的
同一企業内のES版同士を比較して、改稿の変更点が追えるようにする。

### やること（具体）
- 仕様
  - `diff_enabled=true` のときのみ差分導線を表示
  - 差分結果は **保存しない**（フロント計算）
- フロント
  - 比較元/比較先のESVersion選択UI
  - 差分表示（HTMLとして埋め込まない／XSS安全）
- バック
  - 追加APIは原則不要（ES一覧取得で足りる）
  - 必要なら「同一企業チェック」の補助実装

### 動作確認（例）
- diff_enabled OFFだと導線が消える
- 比較対象は同一企業内に制限される

### 完了条件（DoD）
- 改稿の差分を安全に見られる

---

## Phase 5：セキュリティ固め（公開耐性）
### 目的
“公開しても怖すぎない”水準へ引き上げる。

### やること（具体）
- ブルートフォース対策
  - `django-axes` でロックアウト（段階的）
  - `django-ratelimit` 等で `/login` を制限
- 監査ログ拡充
  - LOGIN_SUCCESS / LOGIN_FAIL を記録
  - 重要操作（COMPANY_DELETE, ES_UPDATE, SETTINGS_UPDATE等）を記録
  - IP/User-Agent を保存
- 認可/権限の総点検
  - 全エンドポイントで `owner` フィルタ漏れを点検
- 本番想定のCookie設定（必要に応じて）
  - Secure/HttpOnly/SameSite など

### 動作確認（例）
- 連続ログイン失敗でロックされる
- 監査ログが閲覧できる（自分の分のみ）
- IDOR/XSSの穴がない（設計/実装で担保）

### 完了条件（DoD）
- 公開前の最低限セキュリティラインを満たす

---

## Phase 6：Renderで公開（Docker無しデプロイ）
### 目的
push→自動デプロイの流れを作り、実運用を開始できる状態にする。

### やること（具体）
- Render Web Service 作成（リポジトリ連携）
- Render環境変数の設定
  - `DATABASE_URL`, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, `DJANGO_ALLOWED_HOSTS` 等
- Build/Start コマンドを確定（Docker無し）
  - Build：frontend build → 成果物配置 → `collectstatic`（必要なら）
  - Start：`migrate` → `gunicorn` 起動（runserver禁止）
- 本番設定
  - `DEBUG=False`
  - `ALLOWED_HOSTS` 適切に

### 動作確認（例）
- 本番URLでSPAが表示
- ログイン/CRUDが動く
- DBに接続できる

### 完了条件（DoD）
- 本番稼働 & 自動デプロイが成立

---

## Phase 7：仕上げ（UX改善・運用補強）
### 目的
使い勝手と事故防止を強化し、長期運用に耐える形へ。

### やること（具体）
- UI/UX
  - 一覧のフィルタ/ソート強化（締切近い順、ステータスなど）
  - 削除の事故防止（確認/取り消し導線）
  - 入力体験（バリデーション、カレンダー入力など）
- 運用
  - バックアップ手順書（最低：手動手順）
  - 余裕があれば `pg_dump` の定期化（GitHub Actions cron / Docker不要）
- 品質
  - lint/format（ruff等）
  - 最低限のAPIテスト（回帰防止）

### 完了条件（DoD）
- 日常利用でストレスが少ない
- 事故が起きにくい運用ができる
