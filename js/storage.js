// LocalStorage database wrapper for EduAI Orbit Organiser Dashboard

const STORAGE_KEYS = {
  EVENTS: 'eduai_orbit_events',
  HISTORY: 'eduai_orbit_history',
  REGISTRATIONS: 'eduai_orbit_registrations'
};

// Seed initial mock data if database is empty
export function initDatabase() {
  // 1. Seed Events
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    const mockEvents = [
      {
        id: '101',
        name: 'HCMC AI Meetup 2026',
        description: 'Buổi gặp gỡ và chia sẻ về các mô hình ngôn ngữ lớn (LLM), trí tuệ nhân tạo thế hệ mới và ứng dụng AI thực tiễn trong doanh nghiệp.',
        datetime: '2026-07-10T14:00',
        location: 'Hội trường A, Trường Đại học CNTT',
        points: 5,
        capacity: 150,
        registered: 120,
        tags: ['#AI', '#Python', '#Networking'],
        icon: 'ti-robot'
      },
      {
        id: '102',
        name: 'Solidity Smart Contract Workshop',
        description: 'Hướng dẫn xây dựng Smart Contract trên Ethereum/EDU Chain. Học viết code Solidity, deploy dApp và bảo mật contract cơ bản.',
        datetime: '2026-07-15T09:00',
        location: 'Phòng Lab 302, Tòa nhà B',
        points: 3,
        capacity: 50,
        registered: 45,
        tags: ['#Blockchain', '#Security', '#Backend'],
        icon: 'ti-code'
      },
      {
        id: '103',
        name: 'Kỹ Năng Thuyết Trình Đám Đông (SoftSkills)',
        description: 'Học cách làm chủ sân khấu, thiết kế slides ấn tượng và truyền đạt ý tưởng thuyết phục đến hội đồng ban giám khảo.',
        datetime: '2026-07-20T18:00',
        location: 'Hội trường Lớn',
        points: 2,
        capacity: 200,
        registered: 180,
        tags: ['#SoftSkills', '#General'],
        icon: 'ti-presentation'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(mockEvents));
  }

  // 2. Seed Registrations (Các vé sinh viên đăng ký trước, chuẩn bị check-in)
  if (!localStorage.getItem(STORAGE_KEYS.REGISTRATIONS)) {
    const mockRegistrations = [
      // Sự kiện 101
      {
        ticketId: 'TCK-8921',
        eventId: '101',
        studentName: 'Nguyễn Văn A',
        studentWallet: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
        checkedIn: true
      },
      {
        ticketId: 'TCK-3412',
        eventId: '101',
        studentName: 'Trần Thị B',
        studentWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        checkedIn: true
      },
      {
        ticketId: 'TCK-1011',
        eventId: '101',
        studentName: 'Phan Văn Hùng',
        studentWallet: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        checkedIn: true
      },
      {
        ticketId: 'TCK-5521',
        eventId: '101',
        studentName: 'Lê Minh C',
        studentWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        checkedIn: false
      },
      // Sự kiện 102
      {
        ticketId: 'TCK-9912',
        eventId: '102',
        studentName: 'Nguyễn Văn A',
        studentWallet: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
        checkedIn: true
      },
      {
        ticketId: 'TCK-1021',
        eventId: '102',
        studentName: 'Phan Văn Hùng',
        studentWallet: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        checkedIn: true
      },
      {
        ticketId: 'TCK-1022',
        eventId: '102',
        studentName: 'Lê Thị Thu',
        studentWallet: '0x9965507B1a0595C5411B43b3334d754b2d35C3E5',
        checkedIn: true
      },
      {
        ticketId: 'TCK-4109',
        eventId: '102',
        studentName: 'Phạm Hoàng D',
        studentWallet: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        checkedIn: false
      },
      // Sự kiện 103
      {
        ticketId: 'TCK-1031',
        eventId: '103',
        studentName: 'Nguyễn Văn A',
        studentWallet: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
        checkedIn: true
      },
      {
        ticketId: 'TCK-1032',
        eventId: '103',
        studentName: 'Lê Thị Thu',
        studentWallet: '0x9965507B1a0595C5411B43b3334d754b2d35C3E5',
        checkedIn: true
      },
      {
        ticketId: 'TCK-1033',
        eventId: '103',
        studentName: 'Lê Minh C',
        studentWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        checkedIn: true
      },
      {
        ticketId: 'TCK-1034',
        eventId: '103',
        studentName: 'Trần Thị B',
        studentWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        checkedIn: false
      }
    ];
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(mockRegistrations));
  }

  // 3. Seed History (Lịch sử các lần check-in thành công đã mint SBT trước đó)
  if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
    const mockHistory = [
      {
        studentName: 'Nguyễn Văn A',
        studentWallet: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
        eventName: 'HCMC AI Meetup 2026',
        eventId: '101',
        blockId: '0x7f14e9a38f',
        fullTxHash: '0x7f14e9a38f32145b20a1081512bb673e4d9c72e1',
        points: 5,
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString() // 1 hour ago
      },
      {
        studentName: 'Nguyễn Văn A',
        studentWallet: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
        eventName: 'Solidity Smart Contract Workshop',
        eventId: '102',
        blockId: '0x8c71e3cf5a',
        fullTxHash: '0x8c71e3cf5a2a1975e533c3a4439c2d1b73c4f9a2',
        points: 3,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
      },
      {
        studentName: 'Nguyễn Văn A',
        studentWallet: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
        eventName: 'Kỹ Năng Thuyết Trình Đám Đông (SoftSkills)',
        eventId: '103',
        blockId: '0x9a8b7c6d5e',
        fullTxHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
        points: 2,
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString() // 3 hours ago
      },
      {
        studentName: 'Phan Văn Hùng',
        studentWallet: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        eventName: 'HCMC AI Meetup 2026',
        eventId: '101',
        blockId: '0xa4b3c2d1e0',
        fullTxHash: '0xa4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5',
        points: 5,
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString() // 4 hours ago
      },
      {
        studentName: 'Phan Văn Hùng',
        studentWallet: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        eventName: 'Solidity Smart Contract Workshop',
        eventId: '102',
        blockId: '0xb5c4d3e2f1',
        fullTxHash: '0xb5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6',
        points: 3,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago
      },
      {
        studentName: 'Lê Thị Thu',
        studentWallet: '0x9965507B1a0595C5411B43b3334d754b2d35C3E5',
        eventName: 'Solidity Smart Contract Workshop',
        eventId: '102',
        blockId: '0xc6d5e4f3a2',
        fullTxHash: '0xc6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7',
        points: 3,
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString() // 6 hours ago
      },
      {
        studentName: 'Lê Thị Thu',
        studentWallet: '0x9965507B1a0595C5411B43b3334d754b2d35C3E5',
        eventName: 'Kỹ Năng Thuyết Trình Đám Đông (SoftSkills)',
        eventId: '103',
        blockId: '0xd7e6f5a4b3',
        fullTxHash: '0xd7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8',
        points: 2,
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString() // 7 hours ago
      },
      {
        studentName: 'Trần Thị B',
        studentWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        eventName: 'HCMC AI Meetup 2026',
        eventId: '101',
        blockId: '0x7f14e9a38a',
        fullTxHash: '0x7f14e9a38f32145b20a1081512bb673e4d9c72e2',
        points: 5,
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString() // 8 hours ago
      },
      {
        studentName: 'Lê Minh C',
        studentWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        eventName: 'Kỹ Năng Thuyết Trình Đám Đông (SoftSkills)',
        eventId: '103',
        blockId: '0xe8f7a6b5c4',
        fullTxHash: '0xe8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9',
        points: 2,
        timestamp: new Date(Date.now() - 3600000 * 9).toISOString() // 9 hours ago
      }
    ];
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(mockHistory));
  }
}

// GET lists
export function getEvents() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS)) || [];
}

export function getEventById(id) {
  return getEvents().find(e => e.id === id);
}

export function getHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
}

export function getRegistrations() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS)) || [];
}

// Write / Insert operations
export function createEvent(event) {
  const events = getEvents();
  events.unshift(event);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  return event;
}

export function addRegistration(reg) {
  const regs = getRegistrations();
  regs.push(reg);
  localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));
  return reg;
}

export function checkInTicketLocal(ticketId, eventId, studentWalletAddress, txHash) {
  const regs = getRegistrations();
  const index = regs.findIndex(r => r.ticketId === ticketId && r.eventId === eventId);
  
  if (index !== -1) {
    // 1. Mark ticket as checked-in
    regs[index].checkedIn = true;
    regs[index].studentWallet = studentWalletAddress; // update actual wallet used
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));

    // 2. Add to history logs
    const event = getEventById(eventId);
    const history = getHistory();
    const newLog = {
      studentName: regs[index].studentName,
      studentWallet: studentWalletAddress,
      eventName: event.name,
      eventId: eventId,
      blockId: txHash.substring(0, 10), // Truncate for display in table
      fullTxHash: txHash,
      points: event.points,
      timestamp: new Date().toISOString()
    };
    history.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

    // 3. Update Event registered/checkedin counts locally
    const events = getEvents();
    const evIndex = events.findIndex(e => e.id === eventId);
    if (evIndex !== -1) {
      // Just visually track how many checkins have occurred
      // Let's increment a custom counter if we want, or just leave it
    }

    return newLog;
  }
  return null;
}
