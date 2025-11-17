import { Gift, Star, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

//todo: remove mock functionality
const mockRewards = {
  points: 850,
  tier: "Gold",
  nextTier: "Platinum",
  pointsToNextTier: 150,
};

const mockAvailableRewards = [
  { id: 1, name: "Coffee Voucher", points: 100, category: "F&B" },
  { id: 2, name: "Movie Tickets", points: 300, category: "Entertainment" },
  { id: 3, name: "Gym Membership", points: 500, category: "Wellness" },
];

const mockRewardHistory = [
  { item: "Restaurant Voucher", points: 200, date: "Jan 10, 2024", status: "redeemed" },
  { item: "Spa Package", points: 400, date: "Dec 15, 2023", status: "redeemed" },
];

export default function RewardsPage() {
  const handleRedeem = (id: number) => {
    console.log("Redeeming reward", id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
          Rewards
        </h2>
        <p className="text-sm text-muted-foreground">
          Earn and redeem rewards for your achievements
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Your Tier</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  {mockRewards.tier}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Total Points</p>
                <p className="text-3xl font-bold font-mono" data-testid="text-total-points">
                  {mockRewards.points}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to {mockRewards.nextTier}</span>
                <span>
                  {mockRewards.pointsToNextTier} points needed
                </span>
              </div>
              <Progress
                value={
                  (mockRewards.points / (mockRewards.points + mockRewards.pointsToNextTier)) *
                  100
                }
                className="h-2 bg-primary-foreground/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Available Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockAvailableRewards.map((reward) => (
              <Card key={reward.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium" data-testid={`text-reward-name-${reward.id}`}>
                        {reward.name}
                      </p>
                      <Badge variant="outline" className="mt-1" data-testid={`badge-category-${reward.id}`}>
                        {reward.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-primary">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-semibold" data-testid={`text-points-${reward.id}`}>
                        {reward.points} pts
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRedeem(reward.id)}
                      disabled={mockRewards.points < reward.points}
                      data-testid={`button-redeem-${reward.id}`}
                    >
                      Redeem
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redemption History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockRewardHistory.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                data-testid={`row-history-${index}`}
              >
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-history-item-${index}`}>
                    {item.item}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" data-testid={`text-history-points-${index}`}>
                    -{item.points} pts
                  </span>
                  <Badge variant="default" data-testid={`badge-history-status-${index}`}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
