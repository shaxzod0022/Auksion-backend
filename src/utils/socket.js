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

    socket.on("join_auction", async ({ slug, token, isAdmin }) => {
      try {
        const lot = await Lot.findOne({ slug });
        if (!lot) return socket.emit("error", "Lot topilmadi");

        const room = `auction_${slug}`;
        socket.join(room);

        // Initialize state if not exists
        if (!auctionStates[room]) {
          auctionStates[room] = {
            lotId: lot._id,
            currentPrice: lot.startPrice,
            phase: "prep", // 'prep' or 'bidding' or 'ended'
            prepTime: 300, // 5 minutes (300 seconds)
            turnTime: 30, // 30 seconds
            timer: null,
            lastBidder: null,
            participants: [],
            bids: [],
          };
          startPrepTimer(io, room);
        }

        // Add participant
        if (!auctionStates[room].participants.find(p => p.socketId === socket.id)) {
           auctionStates[room].participants.push({ socketId: socket.id, isAdmin });
        }

        // Send initial state
        socket.emit("auction_state", {
          currentPrice: auctionStates[room].currentPrice,
          phase: auctionStates[room].phase,
          timeLeft: auctionStates[room].timeLeft,
          lastBidder: auctionStates[room].lastBidder,
          bids: auctionStates[room].bids
        });

      } catch (err) {
        console.error("Join auction error:", err);
      }
    });

    socket.on("place_bid", async ({ slug, userId, userName }) => {
      const room = `auction_${slug}`;
      const state = auctionStates[room];

      if (!state || state.phase !== "bidding") return;

      try {
        const lot = await Lot.findById(state.lotId);
        const step = lot.firstStep || 0;

        state.currentPrice += step;
        state.lastBidder = { userId, userName };
        state.bids.push({ userName, amount: state.currentPrice, time: new Date() });
        state.timeLeft = 30; // Reset turn timer

        io.to(room).emit("new_bid", {
          currentPrice: state.currentPrice,
          lastBidder: state.lastBidder,
          bids: state.bids,
          timeLeft: state.timeLeft
        });

      } catch (err) {
        console.error("Bid error:", err);
      }
    });

    socket.on("admin_end_auction", ({ slug }) => {
       const room = `auction_${slug}`;
       endAuction(io, room, "Admin tomonidan yakunlandi");
    });

    socket.on("disconnect", () => {
      // Cleanup logic if needed
    });
  });
};

const startPrepTimer = (io, room) => {
  const state = auctionStates[room];
  state.timeLeft = state.prepTime;

  const interval = setInterval(() => {
    state.timeLeft--;
    io.to(room).emit("timer_update", { timeLeft: state.timeLeft, phase: state.phase });

    if (state.timeLeft <= 0) {
      clearInterval(interval);
      state.phase = "bidding";
      state.timeLeft = 30;
      io.to(room).emit("phase_change", { phase: "bidding", timeLeft: state.timeLeft });
      startTurnTimer(io, room);
    }
  }, 1000);
  state.timer = interval;
};

const startTurnTimer = (io, room) => {
  const state = auctionStates[room];
  
  const interval = setInterval(() => {
    state.timeLeft--;
    io.to(room).emit("timer_update", { timeLeft: state.timeLeft, phase: state.phase });

    if (state.timeLeft <= 0) {
      clearInterval(interval);
      endAuction(io, room, "Vaqt tugadi");
    }
  }, 1000);
  state.timer = interval;
};

const endAuction = async (io, room, reason) => {
  const state = auctionStates[room];
  if (!state || state.phase === "ended") return;

  if (state.timer) clearInterval(state.timer);
  state.phase = "ended";

  // Mark winner in DB if anyone bid
  if (state.lastBidder) {
     try {
       const lot = await Lot.findById(state.lotId);
       lot.status = "successful";
       await lot.save();
       // Note: Protocol generation usually happens in the admin panel manually or automatically here
     } catch(e) { console.error(e); }
  }

  io.to(room).emit("auction_ended", { 
    winner: state.lastBidder, 
    finalPrice: state.currentPrice,
    reason 
  });
  
  // Cleanup after some time
  setTimeout(() => {
    delete auctionStates[room];
  }, 60000);
};

module.exports = initSocket;
