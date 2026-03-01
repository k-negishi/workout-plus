# StatCard 設計仕様

統計項目を並べるグリッドカードの標準実装仕様。Issue #195 で確定。
このファイルは workout-design スキルの参照ファイルです（A案: StatCard 作業時のみ Read）。

---

## レイアウト

```tsx
// グリッド: 3列（gap=8 × 2箇所を考慮して width: '31%'）
<View className="flex-row flex-wrap" style={{ gap: 8 }}>
  <StatCard label="最高重量"  value="100"    unit="kg" />
  <StatCard label="最高1RM"   value="117"    unit="kg" />
  <StatCard label="最高rep数" value="12" />
  <StatCard label="ワークアウト数" value="9" />
  <StatCard label="総セット"  value="28" />
  <StatCard label="総ボリューム"  value="6,288" unit="kg" />
</View>
```

---

## StatCard の実装ポイント

```tsx
function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  // 値の文字数に応じてフォントサイズを動的調整（長い数値がカードからはみ出ないよう制御）
  // 例: "9"(1) → 22px, "1,000"(5) → 18px, "10,000"(6) → 18px, "100,000"(7) → 15px
  const valueFontSize =
    value.length <= 4 ? 22 : value.length <= 6 ? 18 : value.length <= 8 ? 15 : 13;

  return (
    <View style={{ width: '31%', alignItems: 'center', ... }}>
      {/* ラベル: 1行に自動縮小（長いラベルで折り返さないよう）*/}
      <Text
        style={{ fontSize: 13, textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
        <Text style={{ fontSize: valueFontSize, fontWeight: '700' }}>{value}</Text>
        {unit && <Text style={{ fontSize: 13, marginLeft: 2 }}>{unit}</Text>}
      </View>
    </View>
  );
}
```

---

## ラベル命名ルール

3列カードの本文幅は約 95px（31% × 390px − padding 24px）。
13px の日本語フォントで **7文字以内** を目安にする。

| NG（長すぎ） | OK（短縮後） |
|---|---|
| 総ワークアウト回数（9文字） | ワークアウト数（7文字） |
