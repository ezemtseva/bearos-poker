export default function HowToPlay() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">How to Play Bearos Poker</h1>

      <div className="space-y-8 text-white">
        <section>
          <h2 className="text-2xl font-bold mb-3">Game Overview</h2>
          <p>
            Bearos Poker is a trick-taking card game where players bet on how many tricks they'll win in each round. The
            game consists of multiple rounds with varying numbers of cards, and the player with the highest score at the
            end wins.
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
            <li>
              The owner can configure the game length before starting:
              <ul className="list-disc pl-6 mt-2">
                <li>
                  <strong>Short:</strong> 18 rounds
                </li>
                <li>
                  <strong>Basic:</strong> 22 rounds (default)
                </li>
                <li>
                  <strong>Long:</strong> 28 rounds
                </li>
              </ul>
            </li>
            <li>The owner can also enable the "Golden Round" - a special final round with unique rules.</li>
            <li>Once all players have joined, the owner can start the game.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">Game Rounds</h2>
          <p className="mb-3">The game consists of multiple rounds divided into three phases:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Ascending Phase:</strong> The number of cards dealt increases from 1 to 6.
            </li>
            <li>
              <strong>Middle Phase:</strong> Several rounds with 6 cards each.
            </li>
            <li>
              <strong>Blind Phase:</strong> 6 cards are dealt in each round, but players must place their bets before
              seeing their cards.
            </li>
            <li>
              <strong>Descending Phase:</strong> The number of cards dealt decreases from 6 down to 1.
            </li>
            <li>
              <strong>Golden Round (optional):</strong> A final special round where each player receives 1 card.
            </li>
          </ul>
          <p className="mt-3">The exact number of rounds in each phase depends on the selected game length.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">Gameplay</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>At the beginning of each round, cards are dealt to all players.</li>
            <li>Each player places a bet on how many tricks they think they'll win in the round.</li>
            <li>
              The total bets cannot equal the number of cards dealt in the round. The last player to bet will be
              prevented from making a bet that would make the total equal to the number of cards.
            </li>
            <li>
              Starting with the owner in the first round (and the winner of the previous trick thereafter), players take
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
            <li>During the Blind Phase, all points are doubled.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">Golden Round</h2>
          <p>If enabled, the game ends with a special Golden Round with unique rules:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Each player receives only 1 card.</li>
            <li>There is no betting phase in the Golden Round.</li>
            <li>The winner of the trick receives 100 points.</li>
            <li>All other players receive 0 points for this round.</li>
            <li>This round can dramatically change the final standings!</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">Winning the Game</h2>
          <p>After all rounds are completed, the player with the highest total score wins the game.</p>
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
            <li>
              If the Golden Round is enabled, remember that it can completely change the outcome of the game - even if
              you're behind, you still have a chance to win with those 100 points!
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

