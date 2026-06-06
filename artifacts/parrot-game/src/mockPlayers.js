const players = [
  { id: 1,  name: "Aaron Judge",     team: "NYY", barrel: 19, hardHit: 58, parkFactor: 95,  lineupSpot: 2, bullpen: "Weak",   platoonEdge: true,  hrOdds: 320  },
  { id: 2,  name: "Shohei Ohtani",   team: "LAD", barrel: 22, hardHit: 62, parkFactor: 100, lineupSpot: 3, bullpen: "Weak",   platoonEdge: false, hrOdds: 280  },
  { id: 3,  name: "Manny Machado",   team: "SD",  barrel: 14, hardHit: 51, parkFactor: 90,  lineupSpot: 3, bullpen: "Strong", platoonEdge: true,  hrOdds: 480  },
  { id: 4,  name: "Pete Alonso",     team: "NYM", barrel: 17, hardHit: 53, parkFactor: 105, lineupSpot: 4, bullpen: "Weak",   platoonEdge: true,  hrOdds: 360  },
  { id: 5,  name: "Yordan Alvarez",  team: "HOU", barrel: 21, hardHit: 60, parkFactor: 98,  lineupSpot: 4, bullpen: "Strong", platoonEdge: false, hrOdds: 300  },
  { id: 6,  name: "Kyle Tucker",     team: "HOU", barrel: 13, hardHit: 49, parkFactor: 98,  lineupSpot: 5, bullpen: "Strong", platoonEdge: true,  hrOdds: 520  },
  { id: 7,  name: "Juan Soto",       team: "NYY", barrel: 16, hardHit: 54, parkFactor: 95,  lineupSpot: 3, bullpen: "Weak",   platoonEdge: false, hrOdds: 410  },
  { id: 8,  name: "Freddie Freeman", team: "LAD", barrel: 15, hardHit: 52, parkFactor: 100, lineupSpot: 2, bullpen: "Weak",   platoonEdge: true,  hrOdds: 440  },
  { id: 9,  name: "Vladimir Guerrero Jr.", team: "TOR", barrel: 18, hardHit: 57, parkFactor: 108, lineupSpot: 3, bullpen: "Weak", platoonEdge: false, hrOdds: 380 },
  { id: 10, name: "Bo Bichette",     team: "TOR", barrel: 10, hardHit: 44, parkFactor: 108, lineupSpot: 2, bullpen: "Weak",   platoonEdge: true,  hrOdds: 600  },
  { id: 11, name: "Corey Seager",    team: "TEX", barrel: 17, hardHit: 55, parkFactor: 112, lineupSpot: 3, bullpen: "Weak",   platoonEdge: true,  hrOdds: 390  },
  { id: 12, name: "Adolis Garcia",   team: "TEX", barrel: 12, hardHit: 47, parkFactor: 112, lineupSpot: 5, bullpen: "Weak",   platoonEdge: false, hrOdds: 550  },
  { id: 13, name: "Jose Ramirez",    team: "CLE", barrel: 14, hardHit: 50, parkFactor: 97,  lineupSpot: 3, bullpen: "Strong", platoonEdge: true,  hrOdds: 420  },
  { id: 14, name: "Steven Kwan",     team: "CLE", barrel: 6,  hardHit: 38, parkFactor: 97,  lineupSpot: 1, bullpen: "Strong", platoonEdge: true,  hrOdds: 900  },
  { id: 15, name: "Gunnar Henderson",team: "BAL", barrel: 16, hardHit: 53, parkFactor: 106, lineupSpot: 2, bullpen: "Weak",   platoonEdge: true,  hrOdds: 370  },
  { id: 16, name: "Adley Rutschman", team: "BAL", barrel: 11, hardHit: 46, parkFactor: 106, lineupSpot: 3, bullpen: "Weak",   platoonEdge: true,  hrOdds: 580  },
  { id: 17, name: "Fernando Tatis Jr.", team: "SD", barrel: 15, hardHit: 51, parkFactor: 90, lineupSpot: 2, bullpen: "Strong", platoonEdge: false, hrOdds: 430 },
  { id: 18, name: "Bobby Witt Jr.",  team: "KC",  barrel: 12, hardHit: 48, parkFactor: 99,  lineupSpot: 1, bullpen: "Weak",   platoonEdge: true,  hrOdds: 490  },
  { id: 19, name: "Julio Rodriguez", team: "SEA", barrel: 13, hardHit: 49, parkFactor: 94,  lineupSpot: 2, bullpen: "Strong", platoonEdge: false, hrOdds: 510  },
  { id: 20, name: "Matt Olson",      team: "ATL", barrel: 18, hardHit: 55, parkFactor: 103, lineupSpot: 4, bullpen: "Weak",   platoonEdge: true,  hrOdds: 400  },
];

export default players;