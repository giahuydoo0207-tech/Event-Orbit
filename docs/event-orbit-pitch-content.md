# EVENT ORBIT — NỘI DUNG PITCH CHO TEAM LÀM SLIDE

### UniHackfest 2026 · Track 1 — Best Product & Business

> Tài liệu này là nội dung theo từng slide. Phần **Text lên slide** có thể dùng nguyên văn hoặc rút gọn khi thiết kế. Phần **Speaker note** dùng để thuyết trình, không cần đưa hết lên màn hình. Các mục `[CẦN XÁC MINH]` phải được team chốt trước khi pitch.

---

## SLIDE 1 — Cover

### Text lên slide

**Event Orbit**

**Campus Events. Verified on Chain.**

Nền tảng sự kiện học đường giúp organizer xác minh sự tham gia và giúp sinh viên xây dựng hồ sơ thành tích đáng tin cậy bằng Open Campus ID.

**Team:** Đỗ Gia Huy · Nghĩa Trần  
**UniHackfest 2026 · Track 1 — Best Product & Business**

### Speaker note

Event Orbit không bắt đầu từ blockchain. Sản phẩm bắt đầu từ một vấn đề rất quen thuộc: sinh viên tham gia nhiều hoạt động nhưng rất khó chứng minh mình thực sự đã tham gia.

---

## SLIDE 2 — Vấn đề

### Text lên slide

**Sinh viên tham gia nhiều hoạt động, nhưng dữ liệu bị phân mảnh và thành tích rất khó kiểm chứng.**

- Đăng ký nằm rải rác trên Google Form, Luma, Facebook Event hoặc Ticketbox.
- Check-in và đối chiếu danh sách thường được thực hiện thủ công bằng Excel.
- Chứng nhận sau sự kiện dễ thất lạc, chỉnh sửa hoặc không thể kiểm tra nguồn phát hành.
- Organizer mất thời gian xác định ai đăng ký, ai thực sự tham dự và ai đủ điều kiện nhận chứng nhận.
- Sinh viên không có một hồ sơ thống nhất cho workshop, hackathon, hoạt động CLB và chương trình cộng đồng.

> “Đã tham gia một sự kiện” hiện thường chỉ là một tuyên bố — chưa phải một bằng chứng có thể kiểm chứng.

### Speaker note

Vấn đề không nằm ở việc thiếu công cụ tạo sự kiện. Vấn đề nằm ở khoảng trống giữa đăng ký, tham dự thực tế và bằng chứng thành tích sau sự kiện.

---

## SLIDE 3 — Giải pháp

### Text lên slide

**Event Orbit biến sự tham gia thực tế thành một credential có thể xác minh.**

**Tạo sự kiện → Đăng ký/Import → Check-in QR → Xác minh OCID → Cấp badge → Hồ sơ thành tích**

Mỗi credential được liên kết với **Open Campus ID** của sinh viên và được thiết kế để ghi nhận dưới dạng **Soulbound Token trên EDU Chain**.

**Giá trị cốt lõi:**

- Đúng người tham gia.
- Đúng sự kiện.
- Đúng đơn vị phát hành.
- Có thể kiểm chứng lại sau sự kiện.

### Speaker note

Blockchain là lớp xác thực phía sau. Người dùng chỉ cần trải nghiệm một flow quen thuộc: đăng ký, quét QR và nhận badge.

---

## SLIDE 4 — Product Demo

### Text lên slide

**Một flow hoàn chỉnh cho cả organizer và sinh viên**

1. Organizer tạo sự kiện trong Chapter mình quản lý.
2. Sinh viên đăng ký trực tiếp hoặc organizer import danh sách attendee.
3. Người tham dự check-in bằng QR ký số tại sự kiện.
4. Event Orbit xác minh danh tính qua Open Campus ID.
5. Hệ thống cấp badge; người chưa có tài khoản nhận link Claim Badge để xác minh sau.
6. Thành tích xuất hiện trong dashboard và public profile của sinh viên.

**Demo đề xuất:**

`Organizer Portal → Import attendee → QR Check-in → Claim Badge → Achievement Dashboard`

### Speaker note

Đây là sản phẩm chạy end-to-end với database, session và authorization thật — không chỉ là prototype giao diện.

Khi demo, ưu tiên một flow ngắn và liên tục. Không chuyển qua lại quá nhiều màn hình.

---

## SLIDE 5 — Import từ nền tảng ngoài

### Text lên slide

**Không bắt organizer phải thay đổi toàn bộ công cụ đang dùng.**

### CSV/XLSX Import

- Nhận danh sách xuất từ các nền tảng tổ chức sự kiện hiện có.
- Tự động mapping MSSV, email và họ tên.
- Phân loại người đã có tài khoản, đã nhận badge hoặc cần claim.

### Luma Pull → Preview → Confirm

- Organizer nhập Luma event URL hoặc event ID.
- Event Orbit pull attendee về màn hình preview.
- **Preview không ghi database và không tạo claim token.**
- Chỉ khi organizer bấm **Confirm Import**, hệ thống mới issue badge hoặc tạo pending claim.

### Speaker note

Luma integration được thiết kế fail-closed: API key chỉ nằm ở server, request cần organizer session hợp lệ và organizer chỉ được import vào event thuộc Chapter mình quản lý.

**Trạng thái hiện tại:** code cho Luma Preview/Confirm đã hoàn thiện; cần cấu hình Luma Plus API key và hoàn thành live validation trước khi demo tính năng này.

---

## SLIDE 6 — Lợi thế khác biệt

### Text lên slide

**Event Orbit không chỉ quản lý sự kiện — Event Orbit xây dựng lớp credential cho campus.**

- **Chapter-centric:** sinh viên theo dõi cộng đồng Khoa/CLB lâu dài, không chỉ một event đơn lẻ.
- **Identity-linked:** credential gắn với OCID thay vì chỉ là ảnh chứng nhận.
- **Proof of attendance:** QR check-in nối sự tham dự thực tế với quá trình cấp badge.
- **Claim Badge:** hỗ trợ người đăng ký từ nền tảng ngoài và chưa từng có tài khoản Event Orbit.
- **Cumulative profile:** thành tích được tích lũy qua nhiều sự kiện và nhiều Chapter.
- **Safe integration:** nguồn ngoài luôn đi qua Preview → Confirm, không tự động ghi dữ liệu hoặc cấp badge.

### Speaker note

Lợi thế dài hạn không chỉ là tính năng. Khi nhiều Chapter cùng sử dụng, Event Orbit hình thành lịch sử credential liên tục cho sinh viên và trở thành một phần trong workflow vận hành của organizer.

Không nên gọi đây là “moat không thể copy”. Hãy gọi là lợi thế dữ liệu, workflow và network có khả năng tích lũy theo thời gian.

---

## SLIDE 7 — Người dùng & Giá trị

### Text lên slide

| Người dùng | Nhu cầu | Event Orbit mang lại |
|---|---|---|
| **Trường, Khoa, CLB, chương trình đào tạo** | Quản lý event, check-in và cấp chứng nhận | Event management, import, QR check-in, badge issuance |
| **Sinh viên** | Chứng minh hoạt động và thành tích | Hồ sơ credential gắn OCID, có thể chia sẻ và kiểm chứng |
| **Đối tác giáo dục/hackathon** | Phát hành credential mà không tự xây hạ tầng | Quy trình cấp badge và claim cho attendee từ nhiều nguồn |

### Speaker note

Khách hàng trả tiền là tổ chức hoặc Chapter; người dùng tạo network và nhận giá trị trực tiếp là sinh viên.

Thông điệp cần rõ: đây là mô hình B2B2C — bán công cụ vận hành cho tổ chức, tạo hồ sơ thành tích cho sinh viên.

---

## SLIDE 8 — Business Model & Go-to-Market

### Text lên slide

**Freemium theo tổ chức/Chapter**

| Gói | Đối tượng | Giá trị chính |
|---|---|---|
| **Free** | CLB/Khoa nhỏ | Event cơ bản, QR check-in và badge với giới hạn sử dụng |
| **Chapter Pro** | Khoa, CLB lớn, chương trình đào tạo | Import hàng loạt, Claim Badge, dashboard nâng cao và nhiều event hơn |
| **Credential Partner** | Đơn vị đào tạo, hackathon, đối tác giáo dục | Phí tích hợp hoặc phí theo lượng credential phát hành |

**Go-to-market**

1. Bắt đầu bằng một Chapter/pilot trong hệ sinh thái giáo dục hiện có.
2. Mở rộng sang các Khoa và CLB trong cùng trường.
3. Nhân rộng sang chương trình đào tạo, hackathon và đối tác cần phát hành credential.
4. Chuyển từ công cụ event thành **credential infrastructure for campus activities**.

### Speaker note

**Khung market sizing cần điền bằng số thật trước khi pitch:**

`Số trường mục tiêu × số Chapter/trường × số event/Chapter/năm × attendee/event`

**[CẦN XÁC MINH]**

- Số Chapter/CLB thực tế trong trường pilot.
- Số event trung bình mỗi Chapter mỗi năm.
- Số attendee trung bình mỗi event.
- Mức giá thử nghiệm và người có quyền quyết định mua.
- Chi phí phát hành credential và vận hành trên mỗi event.

Không đưa số TAM/SAM/SOM lên slide nếu chưa có nguồn hoặc chưa ghi rõ đó là giả định.

---

## SLIDE 9 — Product Status & Roadmap

### Text lên slide

**Đã hoàn thiện trong sản phẩm chạy được**

- Chapter & Event Management
- Organizer authorization theo Chapter
- Student registration và QR check-in
- CSV/XLSX attendee import
- Claim Badge end-to-end
- Achievement Dashboard & Public Profile
- Event History
- Luma Pull → Preview → Confirm adapter

**Đang hoàn thiện trước demo/production rollout**

- Cấu hình Luma Plus API key và live validation.
- Deploy `ProofBadge.sol` lên EDU Chain testnet.
- Gắn contract address và transaction explorer vào demo.
- Hoàn thiện dữ liệu pilot và số liệu business.

**Roadmap**

- Mở rộng dashboard credential và analytics cho organizer.
- Đánh giá connector cho các nền tảng khác khi API/quyền truy cập cho phép.
- Trở thành hạ tầng credential cho hoạt động học tập ngoài lớp học.

### Speaker note

Không nói smart contract đã deploy nếu chưa có contract address và transaction hash. Không mô tả Facebook hoặc Ticketbox như connector API đã hoạt động; hiện các nguồn này phù hợp với flow CSV/XLSX export/import.

---

## SLIDE 10 — Team & Vision

### Text lên slide

**Đỗ Gia Huy**  
Product Owner · Sinh viên năm 3 Văn Hiến University · Thực tập tại Open Campus

**Nghĩa Trần**  
Data Flow & System Architecture

**Mentor: Cris Tran**  
[CẦN XÁC MINH cách ghi vai trò và quan hệ với Open Campus trước khi đưa lên slide]

> “Mỗi sự kiện sinh viên tham gia thật đều xứng đáng để lại một bằng chứng thật.”

**Event Orbit is a campus event and credential platform for verified student achievement.**

**Thank you · Q&A**

### Speaker note

Kết bằng tầm nhìn, sau đó quay về giá trị rất cụ thể: organizer giảm thao tác thủ công, sinh viên giữ được bằng chứng thành tích và đối tác không cần tự xây hạ tầng credential.

---

# CHECKLIST TRƯỚC KHI TEAM LÀM SLIDE

## 1. Bằng chứng sản phẩm cần chuẩn bị

- Video backup của demo trong trường hợp mạng lỗi.
- Một organizer account và một student account dành riêng cho demo.
- Một event có attendee nhưng không chứa PII thật trên màn hình trình chiếu.
- Một QR còn hạn và một flow Claim Badge đã chuẩn bị trước.
- Contract address, transaction hash và explorer link nếu đã deploy.
- Ảnh terminal/test chỉ dùng trong Q&A, không nên chiếm diện tích slide chính.

## 2. Các claim chỉ được dùng sau khi xác minh

- “Đã chạy production” — chỉ dùng cho đúng flow đã deploy và test trên production.
- “Người dùng thật/organizer thật” — cần số lượng hoặc mô tả pilot cụ thể.
- “Không thể chuyển nhượng” — cần contract thực sự khóa transfer.
- “Đối tác Open Campus” — chỉ dùng khi có quan hệ hợp tác được xác nhận.
- “Luma đã tích hợp” — chỉ dùng sau khi cấu hình key và live-test thành công.
- “Facebook/Ticketbox integration” — hiện chỉ nên mô tả là import danh sách xuất ra file.

## 3. Phân bổ thời gian pitch đề xuất

| Phần | Thời lượng |
|---|---:|
| Problem + Solution | 45–60 giây |
| Live Product Demo | 90–120 giây |
| Differentiation | 30–40 giây |
| Business Model + GTM | 60–75 giây |
| Status + Roadmap + Team | 30–45 giây |

## 4. Nguyên tắc thiết kế deck

- Không mở đầu bằng blockchain hoặc kiến trúc kỹ thuật.
- Mỗi slide chỉ giữ một thông điệp chính.
- Slide demo ưu tiên screenshot thật và đường đi rõ ràng.
- Dùng đúng Open Campus brand: OC Blue `#141BEB`, OC Turquoise `#00EDBE`, Poppins và Space Mono cho kicker/label.
- Không đưa đoạn văn dài lên slide; speaker note giữ phần giải thích.
- Không hiển thị email, MSSV, OCID đầy đủ hoặc claim token thật trong ảnh demo.

# CÂU TRẢ LỜI NGẮN CHO Q&A

### Vì sao cần blockchain?

Blockchain không thay thế quy trình check-in. Nó là lớp bằng chứng phía sau, giúp người xem kiểm tra credential do ai phát hành và giảm khả năng chỉnh sửa sau khi cấp.

### Nếu sinh viên chưa có tài khoản thì sao?

Organizer vẫn có thể import attendee. Event Orbit tạo pending claim sau khi organizer Confirm; sinh viên mở link, xác minh bằng OCID rồi nhận credential đúng danh tính.

### Preview Luma có tự cấp badge không?

Không. Preview chỉ đọc và phân loại dữ liệu. Database, claim token và badge chỉ được tạo sau khi organizer bấm Confirm Import.

### Ai trả tiền?

Khoa, CLB, chương trình đào tạo hoặc đối tác tổ chức sự kiện trả tiền cho công cụ vận hành và hạ tầng credential; sinh viên sử dụng hồ sơ thành tích.

### Điều gì khiến sản phẩm khó bị thay thế?

Workflow được tích hợp vào hoạt động của Chapter, lịch sử credential tích lũy theo thời gian và network giữa organizer, sinh viên cùng các đơn vị phát hành.

### Sản phẩm đang ở giai đoạn nào?

Các flow chính đã chạy end-to-end. Team đang hoàn thành live validation cho Luma, deployment smart contract trên EDU Chain testnet và dữ liệu pilot phục vụ go-to-market.

