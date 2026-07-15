// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ProofBadge is ERC721 {
    struct EventRecord {
        uint256 eventId;
        uint256 points;
        uint256 timestamp;
    }

    // Địa chỉ của Ban tổ chức (OC)
    address public organiser;

    // Quản lý danh sách các admin/organiser phụ có quyền mint
    mapping(address => bool) public isMinster;

    // Lưu thông tin của từng SBT theo tokenId
    mapping(uint256 => EventRecord) public badgeData;

    // Kiểm tra sinh viên đã check-in sự kiện này hay chưa (studentAddress => eventId => checkedIn)
    mapping(address => mapping(uint256 => bool)) public hasCheckedIn;

    // Đếm số lượng SBT đã được mint
    uint256 private _nextTokenId;

    event BadgeMinted(address indexed student, uint256 indexed tokenId, uint256 indexed eventId, uint256 points);
    event MinsterStatusUpdated(address indexed minter, bool status);

    modifier onlyOrganiser() {
        require(msg.sender == organiser, "Chi chu contract moi co quyen");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == organiser || isMinster[msg.sender], "Khong co quyen mint");
        _;
    }

    constructor() ERC721("EduAI Orbit Proof Badge", "PROOF") {
        organiser = msg.sender;
        isMinster[msg.sender] = true;
    }

    // Cập nhật danh sách phụ trách check-in
    function setMinterStatus(address minter, bool status) external onlyOrganiser {
        isMinster[minter] = status;
        emit MinsterStatusUpdated(minter, status);
    }

    // Mint Soulbound Token (SBT) chứng nhận tham gia sự kiện và tặng điểm phong trào
    function mintProofBadge(
        address to,
        uint256 eventId,
        uint256 points
    ) external onlyMinter returns (uint256) {
        require(!hasCheckedIn[to][eventId], "Sinh vien nay da check-in va nhan badge cho su kien nay");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        
        badgeData[tokenId] = EventRecord(eventId, points, block.timestamp);
        hasCheckedIn[to][eventId] = true;

        emit BadgeMinted(to, tokenId, eventId, points);
        
        return tokenId;
    }

    // Trả về tổng số SBT đã mint
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // Lấy thông tin SBT
    function getBadgeData(uint256 tokenId) external view returns (uint256 eventId, uint256 points, uint256 timestamp) {
        _requireOwned(tokenId);
        EventRecord memory record = badgeData[tokenId];
        return (record.eventId, record.points, record.timestamp);
    }

    // Override _update của ERC721 để ngăn cản việc chuyển nhượng token (Soulbound Pattern)
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        // Chỉ cho phép mint (từ address 0) hoặc burn (đến address 0). Chặn hoàn toàn transfer giữa các ví.
        require(from == address(0) || to == address(0), "SBT khong the chuyen nhuong hoac mua ban!");
        return super._update(to, tokenId, auth);
    }
}
