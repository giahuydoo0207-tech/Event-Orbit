# Event Orbit — Organiser Dashboard 

Hệ thống quản lý sự kiện và tự động hóa điểm phong trào bằng AI + SBT (Soulbound Token) trên mạng **EDU Chain Testnet**.

## Cấu trúc dự án

```
eduai-orbit/
├── contracts/                    # Dự án Smart Contract (Hardhat)
│   ├── contracts/
│   │   └── ProofBadge.sol        # Soulbound Token ERC-721 Contract
│   ├── scripts/
│   │   └── deploy.js             # Deploy script lên EDU Chain
│   ├── hardhat.config.js         # Cấu hình Hardhat mạng EDU Chain Codex
│   └── package.json
├── index.html                    # Trang kết nối ví MetaMask
├── dashboard.html                # Dashboard chính (sidebar + metric + lịch sử)
├── create-event.html             # Form tạo sự kiện + AI auto-tag gợi ý kỹ năng
├── checkin.html                   # Trang quét QR code check-in + Mint SBT thực tế
├── style.css                     # Design System (White theme, Light mode mượt mà)
├── js/                           # Thư mục chứa modules logic JS thuần
│   ├── login.js
│   ├── dashboard.js
│   ├── create-event.js
│   ├── checkin.js
│   ├── web3.js                   # Kết nối ví, chuyển mạng EDU Chain, gọi contract
│   ├── storage.js                # Quản lý mock database local (LocalStorage)
│   ├── ai-tagger.js              # Bộ phân tích tự động đề xuất thẻ kỹ năng
│   └── utils.js
├── vite.config.js                # Cấu hình Vite multi-page routing
└── package.json                  # Cấu hình dependencies Frontend
```

---

## Hướng dẫn cài đặt & Chạy thử nghiệm (Local)

Do môi trường Sandbox bị giới hạn quyền cài đặt, vui lòng mở terminal trên máy tính của bạn và thực hiện các bước sau:

### 1. Khởi chạy Frontend
Di chuyển đến thư mục root của dự án và cài đặt các thư viện:
```bash
cd "C:\Users\Dell Latitude 5310\.gemini\antigravity\scratch\eduai-orbit"
npm install
```

Khởi chạy máy chủ phát triển (Dev server):
```bash
npm run dev
```
Terminal sẽ hiển thị địa chỉ local ví dụ: `http://localhost:5173`. Giữ phím Ctrl và click vào link để mở trên trình duyệt.

### 2. Biên dịch & Deploy Smart Contract (Tùy chọn)
Nếu bạn muốn deploy smart contract mới lên ví của bạn thay vì dùng địa chỉ test mặc định:

1. Di chuyển vào thư mục `contracts`:
   ```bash
   cd contracts
   npm install
   ```
2. Tạo file `.env` từ `.env.example` và điền Private Key ví MetaMask của bạn (ví phải có sẵn faucet token EDU Testnet):
   ```bash
   copy .env.example .env
   # Sau đó chỉnh sửa file .env để dán Private Key của bạn
   ```
3. Deploy hợp đồng lên EDU Chain Testnet:
   ```bash
   npx hardhat run scripts/deploy.js --network educhain
   ```
4. Sau khi deploy thành công, copy địa chỉ **Contract Address** in ra trên màn hình.
5. Mở file `js/web3.js` ở dòng 28 và thay thế giá trị của `DEFAULT_CONTRACT_ADDRESS` bằng địa chỉ contract của bạn, hoặc bạn chỉ cần F12 mở console trình duyệt gõ `localStorage.setItem('eduai_orbit_contract_address', 'ĐỊA_CHỈ_MỚI')` để ghi đè mà không cần sửa code.

---

## Kịch bản kiểm thử Core Flow (Không cần ví thật hoặc camera điện thoại)

Tôi đã xây dựng hệ thống **Giả lập (Mocking)** rất mạnh mẽ để bạn có thể test trơn tru toàn bộ luồng nghiệp vụ trên laptop:

### Bước 1: Đăng nhập & Switch Network
1. Truy cập `http://localhost:5173`.
2. Click **Kết nối ví MetaMask**.
3. Ví MetaMask sẽ tự động hiện thông báo yêu cầu bạn chuyển mạng sang **EDU Chain Testnet (Codex)**. Nếu ví của bạn chưa cài mạng này, MetaMask sẽ tự động hiển thị hộp thoại thêm mạng và cấu hình đầy đủ RPC. Nhấn **Xác nhận**.
4. Sau khi kết nối thành công, bạn sẽ được tự động chuyển đến Dashboard.

### Bước 2: Tạo Sự Kiện Mới & AI gợi ý kĩ năng
1. Trên Dashboard, nhấn nút **Tạo sự kiện mới**.
2. Nhập tên sự kiện (ví dụ: *Học máy cơ bản với Python*).
3. Nhập mô tả sự kiện (ví dụ: *Lớp học hướng dẫn các thuật toán Machine Learning cơ bản sử dụng thư viện Python pandas và scikit-learn*).
4. Click chuột ra ngoài ô mô tả (Blur event) -> Bạn sẽ thấy mục **🤖 AI Auto-Tagging** xuất hiện cùng hiệu ứng load mượt mà. AI sẽ tự động sinh và tick chọn các tag phù hợp như `#AI`, `#Python`.
5. Bạn có thể tự nhập thêm tag tùy chọn bên dưới (ví dụ `#DataScience`) và nhấn **+ Thêm tag**.
6. Điền điểm phong trào (ví dụ: `5`), địa điểm, thời gian và nhấn **Tạo sự kiện**.
7. Hệ thống sẽ lưu sự kiện mới và **tự động sinh ra 3 vé đăng ký giả lập** (trong đó có 1 vé khớp với ví MetaMask hiện tại của bạn).

### Bước 3: Check-in & Mint SBT thực tế
1. Tại Dashboard, tìm sự kiện vừa tạo và nhấn nút **Check-in (QR)**.
2. Bạn sẽ chuyển đến trang quét mã QR. 
   * **Nếu dùng điện thoại / laptop có camera**: Bạn có thể quét mã QR vé (chứa payload JSON chứa `ticketId`, `eventId`, và ví của bạn).
   * **Nếu test nhanh trên PC (Không cần camera)**: Tại phần **Giả lập quét mã (Dành cho việc test nhanh)** bên dưới camera, bạn chọn sinh viên từ dropdown (ví dụ: *Sinh viên Test (Ví Bạn)*) rồi nhấn **Quét giả lập**.
3. Hệ thống sẽ tự động gọi MetaMask để bạn ký giao dịch gọi hàm `mintProofBadge()` trên blockchain thật.
4. Xác nhận giao dịch trên MetaMask của bạn.
5. Chờ khoảng 2-3 giây để block được khai thác trên EDU Chain Testnet.
6. Sau khi thành công:
   * Giao diện sẽ hiển thị popup xanh lá báo thành công kèm theo Mã giao dịch (Tx Hash).
   * Danh sách **Hoạt động vừa diễn ra** bên cạnh sẽ cập nhật real-time.
   * Số lượng **Đã check-in** tăng lên.
7. Bạn quay lại Dashboard:
   * Metric card **SBT đã mint** sẽ cập nhật tăng lên (đọc dữ liệu thật từ hàm `totalMinted()` của smart contract).
   * Dòng check-in mới xuất hiện trong bảng **Lịch sử tham gia sự kiện** ở cuối trang. Bạn có thể click trực tiếp vào Block ID (Tx Hash) để xem chi tiết giao dịch trên **EDU Chain Explorer (Blockscout)**!

---

## Kiểm tra tính chất Soulbound (Chặn transfer)

Để xác nhận Token này không thể chuyển nhượng (Soulbound Token):
1. Mở ví MetaMask chứa SBT vừa nhận.
2. Thử gửi (transfer) token đó sang một ví khác.
3. Ví MetaMask / Mạng EDU Chain sẽ chặn giao dịch ngay lập tức và báo lỗi: `"SBT khong the chuyen nhuong hoac mua ban!"` (được định nghĩa trong hàm `_update` của contract).

---

## Hướng dẫn deploy lên Vercel

Dự án sử dụng Vite vanilla JS thuần, do đó deploy lên Vercel vô cùng đơn giản:
1. Đảm bảo toàn bộ code đã được đẩy lên Github.
2. Truy cập [Vercel](https://vercel.com/) và import repository này.
3. Vercel sẽ tự động phát hiện dự án Vite. Bạn chỉ cần giữ nguyên các cấu hình mặc định (Build Command: `npm run build`, Output Directory: `dist`) và nhấn **Deploy**.
4. Dự án của bạn sẽ chạy online online trong vòng vài giây!
