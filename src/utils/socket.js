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
            phase: "waiting", // 'waiting', 'prep', 'bidding', 'ended'
            prepTime: 300, // 5 minutes
            turnTime: 180, // 3 minutes
            timeLeft: 0,
            timer: null,
            lastBidder: null,
            participants: [],
            bids: [],
            aliases: {}, // socketId -> alias (e.g. "1-ishtirokchi")
            aliasCounter: 0
          };
        }

        const state = auctionStates[room];

        // Assign alias to user if not already assigned
        if (!isAdmin && userId && !state.aliases[socket.id]) {
          state.aliasCounter++;
          state.aliases[socket.id] = {
            id: userId,
            name: userName,
            alias: `${state.aliasCounter}-ishtirokchi`
          };
        }

        // Send Current State
        socket.emit("auction_state", {
          currentPrice: state.currentPrice,
          phase: state.phase,
          timeLeft: state.timeLeft,
          lastBidder: state.lastBidder ? {
            userName: isAdmin ? state.lastBidder.userName : state.lastBidder.alias
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

    socket.on("admin_start_auction", ({ slug }) => {
      const room = `auction_${slug}`;
      const state = auctionStates[room];
      if (!state || state.phase !== "waiting") return;

      state.phase = "prep";
      state.timeLeft = state.prepTime;
      io.to(room).emit("phase_change", { phase: "prep", timeLeft: state.timeLeft });
      startPrepTimer(io, room);
    });

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
        
        // Get user alias
        const participant = state.aliases[socket.id] || { alias: "Noma'lum" };
        
        const bidInfo = {
          userId,
          userName, // Real name
          alias: participant.alias, // "X-ishtirokchi"
          amount: state.currentPrice,
          time: new Date()
        };

        state.lastBidder = bidInfo;
        state.bids.push(bidInfo);
        state.timeLeft = 180; // Reset turn timer

        // Broadcast to Admins (with real names)
        const adminSockets = await io.in(room).fetchSockets();
        adminSockets.forEach(s => {
          // If we had a way to check if this specific socket is admin...
          // For now, let's keep it simple and broadcast sanitized to everyone except if they have an admin flag
        });

        // Simplified: Broadcast to all, frontend will handle what to show based on token
        io.to(room).emit("new_bid", {
          currentPrice: state.currentPrice,
          lastBidder: state.lastBidder, // Contains both, frontend will filter
          bids: state.bids,
          timeLeft: state.timeLeft,
          stepAmount
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
      // Maybe cleanup alias if needed, but better keep for history
    });
  });
};

const startPrepTimer = (io, room) => {
  const state = auctionStates[room];
  if (state.timer) clearInterval(state.timer);

  state.timer = setInterval(() => {
    state.timeLeft--;
    io.to(room).emit("timer_update", { timeLeft: state.timeLeft });

    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      state.phase = "bidding";
      state.timeLeft = 180;
      io.to(room).emit("phase_change", { phase: "bidding", timeLeft: state.timeLeft });
      startTurnTimer(io, room);
    }
  }, 1000);
};

const startTurnTimer = (io, room) => {
  const state = auctionStates[room];
  if (state.timer) clearInterval(state.timer);
  
  state.timer = setInterval(() => {
    state.timeLeft--;
    io.to(room).emit("timer_update", { timeLeft: state.timeLeft });

    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      endAuction(io, room, "Vaqt tugadi");
    }
  }, 1000);
};

const endAuction = async (io, room, reason) => {
  const state = auctionStates[room];
  if (!state || state.phase === "ended") return;

  if (state.timer) clearInterval(state.timer);
  state.phase = "ended";

  let winnerProtocol = null;

  if (state.lastBidder) {
     try {
       const lot = await Lot.findByIdAndUpdate(state.lotId, { status: "successful" });
       
       // Create Protocol
       const protocolNumber = `PR-${Date.now()}`;
       const newProtocol = new Protocol({
         lot: state.lotId,
         winner: state.lastBidder.userId,
         protocolNumber,
         status: "active"
       });
       await newProtocol.save();
       winnerProtocol = newProtocol;

     } catch(e) { console.error("Winner processing error:", e); }
  } else {
     await Lot.findByIdAndUpdate(state.lotId, { status: "unsuccessful" });
  }

  io.to(room).emit("auction_ended", { 
    winner: state.lastBidder, 
    finalPrice: state.currentPrice,
    protocolId: winnerProtocol ? winnerProtocol._id : null,
    reason 
  });
  
  setTimeout(() => {
    delete auctionStates[room];
  }, 3600000); // 1 hour cleanup
};

module.exports = initSocket;
