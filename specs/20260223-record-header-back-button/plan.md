# 実装計画: RecordScreen ヘッダー改修（Issue #131）

## アーキテクチャ概要

変更はすべて `RecordScreen.tsx` のヘッダー View に閉じる。
ナビゲーション・DB・ストアへの変更は不要。

## 実装方針

### 現状
```tsx
<View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ffffff', ... }}>
  <Text style={{ fontSize: 13, fontWeight: '500', color: '#475569' }}>{headerDateLabel}</Text>
</View>
```

### 変更後
```tsx
<View style={{ backgroundColor: '#4D94FF', paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 12 }}>
  {/* 3列レイアウト: 戻るボタン | タイトル | スペーサー */}
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="戻る" style={{ width: 40 }}>
      <Ionicons name="chevron-back" size={24} color="#ffffff" />
    </TouchableOpacity>
    <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
      {headerDateLabel}
    </Text>
    <View style={{ width: 40 }} /> {/* 右側スペーサー */}
  </View>
</View>
```

## 依存関係

- `@expo/vector-icons` (Ionicons): 既導入済み
- `navigation.goBack()`: `useNavigation` から取得済み（ただし型が `HomeStackParamList` 固定）
- `insets.top`: `useSafeAreaInsets` 取得済み

## navigation 型の調整

`RecordScreen` の `useNavigation` 型が `NativeStackNavigationProp<HomeStackParamList, 'Record'>` に
固定されているが、CalendarStack でも使われる。`goBack()` は両 Stack で共通のため、
型アサーションは不要（`goBack` は `@react-navigation/native` の共通メソッド）。

## テスト計画

### 追加するテストケース

1. **戻るボタンの表示** - `accessibilityLabel="戻る"` の要素が存在すること
2. **戻るボタンのタップ** - `navigation.goBack()` が呼ばれること
3. **ヘッダータイトルの表示** - `M月d日のワークアウト` 形式のテキストが存在すること
4. **ヘッダーの青背景** - ヘッダー View の `backgroundColor` が `#4D94FF` であること

### 既存テストへの影響

- `insets.top に基づいた paddingTop`: 現行は `record-screen-container` の `paddingTop` を検証。
  ヘッダーを分離するため、コンテナの `paddingTop` は `0` に変更し、ヘッダー内の `paddingTop` で吸収する。
  → テスト修正が必要（`paddingTop: 0` または `paddingTop: insets.top` の検証対象変更）

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `RecordScreen.tsx` | ヘッダー View を3列青ヘッダーに置き換え。`Ionicons` import 追加。`paddingTop` をコンテナからヘッダーへ移動 |
| `RecordScreen.test.tsx` | SafeArea テスト修正 + 戻るボタン・タイトル・背景色テスト追加 |
