import { Calculator, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

//todo: remove mock functionality
const mockTaxInfo = {
  year: 2024,
  grossIncome: 54000,
  taxableIncome: 45000,
  taxPaid: 3200,
  taxDue: 3500,
  refund: 0,
};

export default function IncomeTaxPage() {
  const handleDownload = () => {
    console.log("Downloading tax summary");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
            Income Tax
          </h2>
          <p className="text-sm text-muted-foreground">
            View your tax summary and documents
          </p>
        </div>
        <Button onClick={handleDownload} data-testid="button-download-tax">
          <Download className="mr-2 h-4 w-4" />
          Download Summary
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Year {mockTaxInfo.year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Gross Income</p>
              <p className="text-2xl font-bold font-mono" data-testid="text-gross-income">
                ${mockTaxInfo.grossIncome.toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Taxable Income</p>
              <p className="text-2xl font-bold font-mono" data-testid="text-taxable-income">
                ${mockTaxInfo.taxableIncome.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax Paid YTD</span>
                <span className="font-medium">${mockTaxInfo.taxPaid.toLocaleString()}</span>
              </div>
              <Progress
                value={(mockTaxInfo.taxPaid / mockTaxInfo.taxDue) * 100}
                className="h-2"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Estimated Tax Due</span>
                <span className="text-xl font-bold font-mono" data-testid="text-tax-due">
                  ${mockTaxInfo.taxDue.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Based on current year earnings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div>
                <p className="font-medium">IR8A Form 2024</p>
                <p className="text-sm text-muted-foreground">Annual tax statement</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-download-ir8a">
                Download
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div>
                <p className="font-medium">Tax Relief Summary</p>
                <p className="text-sm text-muted-foreground">Deductions and reliefs</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-download-relief">
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
