const socketIO = require("socket.io");
const Lot = require("../model/lot.model");
const Application = require("../model/application.model");
const Protocol = require("../model/protocol.model");

const auctionStates = {}; // In-memory storage for active auctions

const initSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("join_auction", async ({ slug, isAdmin, userId, userName }) => {
      try {
        const lot = await Lot.findOne({ slug });
        if (!lot) return socket.emit("error", "Lot topilmadi");

        const room = `auction_${slug}`;
        socket.join(room);

        // Initialize state if not exists
        if (!auctionStates[room]) {
          auctionStates[room] = {
            lotId: lot._id,
            slug: slug,
            currentPrice: lot.startPrice,
            phase: "waiting", // 'waiting', 'prep', 'bidding', 'finished_waiting', 'ended'
            prepTime: 300, // 5 minutes
            turnTime: 180, // 3 minutes
            timeLeft: 0,
            timer: null,
            lastBidder: null,
            participants: [],
            bids: [],
            userAliases: {}, // userId -> { alias, name }
            socketToUserId: {}, // socketId -> userId
            aliasCounter: 0,
            protocolId: null, // Protocol created during finished_waiting
          };
        }

        const state = auctionStates[room];

        // Assign alias to user if not already assigned (based on userId for persistence)
        if (!isAdmin && userId) {
          if (!state.userAliases[userId]) {
            state.aliasCounter++;
            state.userAliases[userId] = {
              name: userName,
              alias: `${state.aliasCounter}-ishtirokchi`
            };
          }
          // Map current socket to this user
          state.socketToUserId[socket.id] = userId;
        }

        // Send Current State
        socket.emit("auction_state", {
          currentPrice: state.currentPrice,
          phase: state.phase,
          timeLeft: state.timeLeft,
          protocolId: state.protocolId,
          lastBidder: state.lastBidder ? {
            userId: state.lastBidder.userId,
            userName: isAdmin ? state.lastBidder.userName : state.lastBidder.alias,
            alias: state.lastBidder.alias
          } : null,
          bids: state.bids.map(b => ({
            ...b,
            userName: isAdmin ? b.userName : b.alias
          }))
        });

      } catch (err) {
        console.error("Join auction error:", err);
      }
    });

    // Admin boshlash tugmasini bosganda — prep fazaga o'tish
    socket.on("admin_start_auction", ({ slug }) => {
      const room = `auction_${slug}`;
      const state = auctionStates[room];
      if (!state || state.phase !== "waiting") return;

      state.phase = "prep";
      state.timeLeft = state.prepTime;
      io.to(room).emit("phase_change", { phase: "prep", timeLeft: state.timeLeft });
      startPrepTimer(io, room);
    });

    // Ishtirokchi qadam bosishi
    socket.on("place_bid", async ({ slug, userId, userName }) => {
      const room = `auction_${slug}`;
      const state = auctionStates[room];

      if (!state || state.phase !== "bidding") return;

      try {
        const lot = await Lot.findById(state.lotId);
        
        // Calculate step amount from percentage
        const stepPercent = lot.firstStep || 0;
        const stepAmount = Math.floor((lot.startPrice * stepPercent) / 100);

        state.currentPrice += stepAmount;
        
        // Get user alias using the persistent mapping
        const userIdForSocket = state.socketToUserId[socket.id] || userId;
        const participant = state.userAliases[userIdForSocket] || { alias: "Noma'lum" };
        
        const bidInfo = {
          userId,
          userName, // Real name
          alias: participant.alias, // "X-ishtirokchi"
          amount: state.currentPrice,
          time: new Date()
        };

        state.lastBidder = bidInfo;
        state.bids.push(bidInfo);
        state.timeLeft = state.turnTime; // Reset turn timer to 3 minutes

        // Broadcast to all
        io.to(room).emit("new_bid", {
          currentPrice: state.currentPrice,
          lastBidder: state.lastBidder,
          bids: state.bids,
          timeLeft: state.timeLeft,
          stepAmount
        });

      } catch (err) {
        console.error("Bid error:", err);
      }
    });

    // Admin auksionni tasdiqlash va yakunlash
    socket.on("admin_end_auction", ({ slug }) => {
       const room = `auction_${slug}`;
       const state = auctionStates[room];
       if (!state) return;

       // Admin bidding yoki finished_waiting fazada yakunlashi mumkin
       if (state.phase === "bidding") {
         // Admin savdo jarayonida to'xtatmoqchi — avval timer to'xtatamiz, keyin yakunlaymiz
         if (state.timer) clearInterval(state.timer);
         finalizeAuction(io, room, "Admin tomonidan yakunlandi");
       } else if (state.phase === "finished_waiting") {
         // Timer tugagan, admin tasdiqlayapti — rasman yakunlash
         finalizeAuction(io, room, "Admin tomonidan tasdiqlandi");
       }
    });

    socket.on("disconnect", () => {
      // Cleanup current socket mapping
      const roomKeys = Object.keys(auctionStates);
      for (const room of roomKeys) {
        if (auctionStates[room].socketToUserId[socket.id]) {
          delete auctionStates[room].socketToUserId[socket.id];
        }
      }
    });
  });
};

// 5 daqiqa tayyorgarlik timeri
const startPrepTimer = (io, room) => {
  const state = auctionStates[room];
  if (state.timer) clearInterval(state.timer);

  state.timer = setInterval(() => {
    state.timeLeft--;
    io.to(room).emit("timer_update", { timeLeft: state.timeLeft });

    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      // Tayyorgarlik tugadi — savdo boshlanadi
      state.phase = "bidding";
      state.timeLeft = state.turnTime; // 3 daqiqa
      io.to(room).emit("phase_change", { phase: "bidding", timeLeft: state.timeLeft });
      startTurnTimer(io, room);
    }
  }, 1000);
};

// Har bir qadam uchun 3 daqiqa timer  
const startTurnTimer = (io, room) => {
  const state = auctionStates[room];
  if (state.timer) clearInterval(state.timer);
  
  state.timer = setInterval(() => {
    state.timeLeft--;
    io.to(room).emit("timer_update", { timeLeft: state.timeLeft });

    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      // Timer tugadi — AUKSION AVTOMATIK YAKUNLANMAYDI!
      // O'rniga finished_waiting fazaga o'tadi va admin tasdiqlashini kutadi
      moveToFinishedWaiting(io, room);
    }
  }, 1000);
};

// Timer tugaganda — admin kutish fazasiga o'tish va bayonnoma tayyorlash
const moveToFinishedWaiting = async (io, room) => {
  const state = auctionStates[room];
  if (!state || state.phase === "ended" || state.phase === "finished_waiting") return;

  state.phase = "finished_waiting";
  state.timeLeft = 0;

  let protocolId = null;

  // Agar g'olib bo'lsa — bayonnomani avtomatik tayyorlaymiz
  if (state.lastBidder) {
    try {
      const protocolNumber = `PR-${Date.now()}`;
      const participantsList = Object.values(state.userAliases)
        .map(p => p.alias)
        .join(", ");

      const newProtocol = new Protocol({
        lot: state.lotId,
        winner: state.lastBidder.userId,
        protocolNumber,
        finalPrice: state.currentPrice,
        participantsList,
        status: "active"
      });
      await newProtocol.save();
      state.protocolId = newProtocol._id;
      protocolId = newProtocol._id;
    } catch (e) {
      console.error("Protocol creation error:", e);
    }
  }

  io.to(room).emit("phase_change", { 
    phase: "finished_waiting", 
    timeLeft: 0,
    lastBidder: state.lastBidder,
    protocolId: protocolId,
    currentPrice: state.currentPrice
  });
};

// Admin tasdiqlash — auksionni rasman yakunlash
const finalizeAuction = async (io, room, reason) => {
  const state = auctionStates[room];
  if (!state || state.phase === "ended") return;

  if (state.timer) clearInterval(state.timer);
  state.phase = "ended";

  let protocolId = state.protocolId;

  if (state.lastBidder) {
    try {
      // Lot statusini yangilash
      await Lot.findByIdAndUpdate(state.lotId, { status: "successful" });

      // Agar bayonnoma hali yaratilmagan bo'lsa (admin savdo jarayonida to'xtatgan)
      if (!protocolId) {
        const protocolNumber = `PR-${Date.now()}`;
        const participantsList = Object.values(state.userAliases)
          .map(p => p.alias)
          .join(", ");

        const newProtocol = new Protocol({
          lot: state.lotId,
          winner: state.lastBidder.userId,
          protocolNumber,
          finalPrice: state.currentPrice,
          participantsList,
          status: "active"
        });
        await newProtocol.save();
        protocolId = newProtocol._id;
        state.protocolId = protocolId;
      }
    } catch (e) {
      console.error("Winner processing error:", e);
    }
  } else {
    // G'olib yo'q
    await Lot.findByIdAndUpdate(state.lotId, { status: "unsuccessful" });
  }

  io.to(room).emit("auction_ended", { 
    winner: state.lastBidder, 
    finalPrice: state.currentPrice,
    protocolId: protocolId,
    reason 
  });
  
  // 1 soatdan keyin xotiradan tozalash
  setTimeout(() => {
    delete auctionStates[room];
  }, 3600000);
};

module.exports = initSocket;
