export default function HowToPlay() {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">How to Play Bearos Poker</h1>
  
        <div className="space-y-8 text-white">
          <section>
            <h2 className="text-2xl font-bold mb-3">Game Overview</h2>
            <p>
              Bearos Poker is a trick-taking card game where players bet on how many tricks they'll win in each round. The
              game consists of 18 rounds with varying numbers of cards, and the player with the highest score at the end
              wins.
            </p>
          </section>
  
          <section>
            <h2 className="text-2xl font-bold mb-3">Game Setup</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>2-6 players can participate in a game.</li>
              <li>
                The game uses a 36-card deck with cards from 6 to Ace in four suits: spades, hearts, diamonds, and clubs.
              </li>
              <li>The game owner creates a table and shares the link with other players to join.</li>
              <li>Once all players have joined, the owner can start the game.</li>
            </ul>
          </section>
  
          <section>
            <h2 className="text-2xl font-bold mb-3">Game Rounds</h2>
            <p className="mb-3">The game consists of 18 rounds divided into three phases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Ascending Phase (Rounds 1-6):</strong> The number of cards dealt equals the round number (1-6
                cards).
              </li>
              <li>
                <strong>Blind Phase (Rounds 7-12):</strong> 6 cards are dealt in each round, but players must place their
                bets before seeing their cards.
              </li>
              <li>
                <strong>Descending Phase (Rounds 13-18):</strong> The number of cards dealt decreases from 6 down to 1.
              </li>
            </ul>
          </section>
  
          <section>
            <h2 className="text-2xl font-bold mb-3">Gameplay</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>At the beginning of each round, cards are dealt to all players.</li>
              <li>Each player places a bet on how many tricks they think they'll win in the round.</li>
              <li>
                Starting with the owner in the first round (and the winner of the previous round thereafter), players take
                turns playing one card at a time.
              </li>
              <li>Players must follow the suit of the first card played if possible.</li>
              <li>If a player cannot follow suit, they must play a diamond (trump) if they have one.</li>
              <li>If a player has neither the leading suit nor a diamond, they can play any card.</li>
              <li>
                The highest card of the leading suit wins the trick, unless a diamond (trump) is played, in which case the
                highest diamond wins.
              </li>
              <li>The winner of a trick leads the next play.</li>
              <li>After all cards are played, scores are calculated based on bets and tricks won.</li>
            </ol>
          </section>
  
          <section>
            <h2 className="text-2xl font-bold mb-3">Special Cards</h2>
            <p className="mb-3">The 7 of spades is a special card with three possible play options:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Trumps:</strong> Can only be played as the first card of a trick. Forces all players to play their
                highest diamond, or if they have no diamonds, their highest card of any suit.
              </li>
              <li>
                <strong>Poker:</strong> Can be played at any time. Allows all players to play any card regardless of the
                leading suit.
              </li>
              <li>
                <strong>Simple:</strong> Follows normal rules - can only be played if the player has no cards of the
                leading suit (unless the leading suit is diamonds, in which case it can always be played).
              </li>
            </ul>
          </section>
  
          <section>
            <h2 className="text-2xl font-bold mb-3">Scoring</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>If a player wins exactly the number of tricks they bet, they receive 10 points per trick.</li>
              <li>If a player wins more tricks than they bet, they receive 1 point per trick won.</li>
              <li>If a player wins fewer tricks than they bet, they lose 10 points per trick difference.</li>
              <li>If a player bets 0 and wins no tricks, they receive 5 points.</li>
              <li>During the Blind Phase (rounds 7-12), all points are doubled.</li>
            </ul>
          </section>
  
          <section>
            <h2 className="text-2xl font-bold mb-3">Winning the Game</h2>
            <p>After all 18 rounds are completed, the player with the highest total score wins the game.</p>
          </section>
  
          <section>
            <h2 className="text-2xl font-bold mb-3">Tips for New Players</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pay attention to which cards have been played to better predict your chances of winning tricks.</li>
              <li>Remember that diamonds are always trumps and will beat any other suit.</li>
              <li>
                Use the 7 of spades strategically - the Trumps option can be particularly powerful as the first card.
              </li>
              <li>In the Blind Phase, be conservative with your bets since you won't see your cards before betting.</li>
              <li>Keep track of other players' scores to adjust your strategy in the final rounds.</li>
            </ul>
          </section>
        </div>
      </div>
    )
  }
  
  